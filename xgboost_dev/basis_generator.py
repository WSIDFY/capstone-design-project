import pandas as pd
import numpy as np
import shap
import model_manager
import preprocess
import datetime

# [데이터를 받아와서 학습 된 모델을 토대로 검증 후 근거데이터 생성]
# 주요 기능: 실시간 거래 분석, SHAP 기반 기여도 산출, 블랙리스트 즉시 판별 및 근거 데이터 생성
# FDS_AML 내부 생성기가 거래를 생성하여 백엔드로 전송하면 이 모듈이 해당 거래를 분석합니다.

class FraudAnalyzer:

    def __init__(self):
        # 미리 학습된 모델 로드
        self.model = model_manager.load_existing_model()
        if self.model is None:
            raise FileNotFoundError("학습된 모델 파일이 없습니다. 먼저 학습을 진행해 주세요.")
            
        # SHAP Explainer 초기화 (트리 모델 전용 TreeExplainer 사용)
        self.explainer = shap.TreeExplainer(self.model)

        # 자금세탁 패턴 추적용 메모리(동일 nameDest로 들어온 금액이 바로 다음 step에서 CASH_OUT으로 빠져나가는지 감지)
        self.transfer_history = {}

    # 한 건의 거래 데이터를 받아 탐지하고 Qwen 보고서 근거 데이터 생성
    def analyze_transaction(self, raw_tx_data):

        # 거래 발생 시각
        timestamp = raw_tx_data.get('transactionDate')
        if not timestamp:
            timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # 거래 핵심 필드
        orig_acc = raw_tx_data.get('sender')  # 송신자 계좌
        dest_acc = raw_tx_data.get('receiver')  # 수신자 계좌
        step = int(raw_tx_data.get('step', 0))  # 거래 시점 (시간 단위)
        tx_type = raw_tx_data.get('type', '')   # 거래 유형 (TRANSFER, CASH_OUT 등)
        amount = float(raw_tx_data.get('amount', 0.0))  # 거래 금액
        oldbalance_org = float(raw_tx_data.get('oldbalanceOrg', 0.0))   # 송신자 거래 전 잔액
        newbalance_orig = float(raw_tx_data.get('newbalanceOrig', 0.0)) # 송신자 거래 후 잔액

        # 블랙리스트 판별: split_3.csv의 is_blacklist 값 활용
        blacklist_flag = raw_tx_data.get('is_blacklist')
        if blacklist_flag is not None:
            try:
                flag_value = int(blacklist_flag)
            except (ValueError, TypeError):
                flag_value = 0

            is_orig_black = flag_value in (1, 3)
            is_dest_black = flag_value in (2, 3)
        else:
            # TODO: 데이터 셋 DB화 이후 DB 블랙리스트 테이블을 조회하는 함수로 대체
            # 예: is_orig_black = self.blacklist_service.is_blacklisted(orig_acc)
            #     is_dest_black = self.blacklist_service.is_blacklisted(dest_acc)
            is_orig_black = orig_acc in preprocess.BLACKLIST_ACCOUNTS
            is_dest_black = dest_acc in preprocess.BLACKLIST_ACCOUNTS

        # 보이스피싱 의심 패턴(잔고 전체를 이체하고 남은 잔고가 0인 경우)
        is_phishing_pattern = amount == oldbalance_org and newbalance_orig == 0

        # 고액 자금세탁 연쇄 패턴(이전 TRANSFER 수신 계좌가 곧바로 CASH_OUT하는지 추적)
        is_chain_laundering = False
        laundering_evidence = None
        if tx_type == 'CASH_OUT':
            previous = self.transfer_history.get(orig_acc)
            if previous is not None:
                prev_step, prev_amount = previous
                if step in (prev_step, prev_step + 1):
                    is_chain_laundering = True
                    laundering_evidence = {
                        'feature': 'chain_laundering',
                        'score': 10.0,
                        'value': orig_acc,
                        'desc': f"자금세탁 의심거래 : {orig_acc} 계좌에서 대량의 자금 유입(TRANSFER) 직후, {step - prev_step} 시간 단계 내에 즉각적인 현금화(CASH_OUT) 시도가 확인됨. 이는 자금의 출처를 흐리고 추적을 회피하려는 전형적인 자금세탁(Structuring) 의심 행위로 판단됨"
                    }

        # 현재 거래가 TRANSFER이면 연쇄 탐지를 위해 기록 유지
        if tx_type == 'TRANSFER' and dest_acc:
            self.transfer_history[dest_acc] = (step, amount)

        # 송/수신자 중 블랙리스트에 속한 사용자가 있다면 의심거래내역으로 분류
        is_blacklist = is_orig_black or is_dest_black

        # 보이스피싱 또는 연쇄 자금세탁 패턴이 감지되었을 때 즉시 의심 거래로 판단
        rule_suspicion = is_phishing_pattern or is_chain_laundering or is_blacklist

        # 전처리: 입력된 딕셔너리를 DataFrame으로 변환 후 피처 엔지니어링
        df_tx = pd.DataFrame([raw_tx_data])
        processed_tx = preprocess.engineer_features(df_tx)
        
        # 만약 사기 유형이 발생하는 컬럼이 아닌 경우('TRANSFER', 'CASH_OUT'컬럼을 제외한 컬럼일 때)
        if processed_tx.empty:
            evidence = []
            if is_orig_black:
                evidence.append({"column": "sender", "contribution": 10.0, 
                                 "actual_value": orig_acc, "desc": "블랙리스트 송신자 식별 : 내부 데이터베이스에 등록된 고위험 블랙리스트 대상자와의 연루 거래 식별. 제재 대상자와의 금지된 금융 접촉으로 분류됨."})
            if is_dest_black:
                evidence.append({"column": "receiver", "contribution": 10.0, 
                                 "actual_value": dest_acc, "desc": "블랙리스트 수신자 식별 : 내부 데이터베이스에 등록된 고위험 블랙리스트 대상자와의 연루 거래 식별. 제재 대상자와의 금지된 금융 접촉으로 분류됨."})
            if is_phishing_pattern:
                evidence.append({"column": "phishing_pattern", "contribution": 10.0,
                                 "actual_value": amount,
                                 "desc": "보이스피싱 의심 : 계좌 내 전액 외부 송금 발생 및 잔액 급감(0원). 단시간 내 자산 전액 유출은 전형적인 보이스피싱 피해 사례의 긴급 자금 인출 패턴으로 판단됨."})
            if is_chain_laundering and laundering_evidence is not None:
                evidence.append(laundering_evidence)

            # info에서 is_blacklist 필드 제외 (순수 거래 정보만 포함)
            info_data = {k: v for k, v in raw_tx_data.items() if k != 'is_blacklist'}
            
            # [TRANSFER/CASH_OUT 제외 거래 유형 처리]
            # 이 거래는 AI 모델 학습에서 제외된 유형이므로 규칙 기반 판정만 수행
            return {
                "timestamp": timestamp,
                "is_suspicious": bool(rule_suspicion),
                "risk_score": 0.0,  # 모델 예측 미실행 (학습 제외 유형)
                "is_blacklist": is_blacklist,
                "evidence": evidence if rule_suspicion else [],
                "info": info_data,
                "note": "AI 분석 제외 유형이나 블랙리스트 계좌 포함됨"
            }

        # 모델 입력에 불필요한 컬럼 제거('TRANSFER', 'CASH_OUT'을 제외한 컬럼에 대한 내용이 전달되면 제외시키고 학습)
        X_tx = processed_tx.drop(['isFraud', 'isFlaggedFraud', 'sender', 'receiver', 'is_blacklist'], axis=1, errors='ignore')
        prob = self.model.predict_proba(X_tx)[:, 1][0]
        
        # 근거 생성: SHAP 값 추출
        # shap_values[1]은 '사기(Class 1)'로 분류될 확률에 대한 기여도
        shap_values = self.explainer.shap_values(X_tx)
        feature_names = X_tx.columns.tolist() # 기여도가 높은 순서대로 피처와 수치 매핑
        contributions = shap_values[0] # 단일 데이터라 첫 번째 인덱스 사용
        
        evidence_list = []
        for name, weight in zip(feature_names, contributions):
            evidence_list.append({
                "column": name,
                "contribution": round(float(weight), 4), # 양수면 사기 위험 가중, 음수면 정상 가중
                "actual_value": raw_tx_data.get(name, "N/A") # 원본 수치
            })

        # 기여도 절댓값 기준 상위 3개만 추출 (단, sender, receiver는 제외)
        top_evidence = [
                e for e in sorted(evidence_list, key=lambda x: abs(x['contribution']), reverse=True)
                if e['column'] not in ['sender', 'receiver']
            ][:3]
        
        # *Qwen에게 전달할 최종 정보*
        is_suspicious_final = bool(rule_suspicion or prob > 0.8)
        
        # info에서 is_blacklist 필드 제외 (순수 거래 정보만 포함)
        info_data = {k: v for k, v in raw_tx_data.items() if k != 'is_blacklist'}
        
        tx_analysis = {
                "timestamp": timestamp,           # 거래 수신 시각
                "is_suspicious": is_suspicious_final,  # 의심거래 판정
                "risk_score": round(float(prob), 4),   # 모델 사기 확률
                "is_blacklist": is_blacklist,         # 블랙리스트 여부
                "evidence": top_evidence if is_suspicious_final else [],  # 의심근거 (정상거래는 [])
                "info": info_data                      # 원본 거래 정보
            }

        # 규칙 탐지 근거를 최상단에 삽입 (의심거래일 때만)
        if is_suspicious_final:
            if is_phishing_pattern:
                tx_analysis["evidence"].insert(0, {
                    "feature": "phishing_pattern", "score": 10.0, "value": amount,
                    "desc": "보이스피싱 의심 : 계좌 내 전액 외부 송금 발생 및 잔액 급감(0원). 단시간 내 자산 전액 유출은 전형적인 보이스피싱 피해 사례의 긴급 자금 인출 패턴으로 판단됨."
                })
            if is_chain_laundering and laundering_evidence is not None:
                tx_analysis["evidence"].insert(0, laundering_evidence)
            if is_orig_black:
                tx_analysis["evidence"].insert(0, {
                    "feature": "sender", "score": 10.0, "value": orig_acc, "desc": "블랙리스트 송신자 식별 : 내부 데이터베이스에 등록된 고위험 블랙리스트 대상자와의 연루 거래 식별. 제재 대상자와의 금지된 금융 접촉으로 분류됨."
                })
            if is_dest_black:
                tx_analysis["evidence"].insert(0, {
                    "feature": "receiver", "score": 10.0, "value": dest_acc, "desc": "블랙리스트 수신자 식별 : 내부 데이터베이스에 등록된 고위험 블랙리스트 대상자와의 연루 거래 식별. 제재 대상자와의 금지된 금융 접촉으로 분류됨."
                })
            
        return tx_analysis  # Qwen으로 전달되는 최종 분석 결과


# XGBoost 머신러닝 실행 코드
if __name__ == "__main__":
    analyzer = FraudAnalyzer()

    print("FraudAnalyzer 모듈이 정상적으로 로드되었습니다.")
    print("이 모듈은 FDS_AML에서 전달된 거래 데이터를 분석하기 위한 AI 서비스로 사용됩니다.")
            