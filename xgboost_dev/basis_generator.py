import pandas as pd
import numpy as np
import shap
import model_manager
import preprocess
import datetime
from Transaction_generator import transaction_generator

#? [데이터를 받아와서 학습 된 모델을 토대로 검증 후 근거데이터 생성]
#? 주요 기능: 실시간 거래 분석, SHAP 기반 기여도 산출, 블랙리스트 즉시 판별 및 근거 데이터 생성

#! [추후 명세 후 수정]----------------------------------------
#! 실시간 거래 내역을 받아오는 가상의 변수/함수
#! 데이터 형식: {'step': 1, 'type': 'TRANSFER', 'amount': 150000, ...} 
#! ---------------------------------------------------------

def get_realtime_transaction_history(file_path='data/split_3.csv', interval_seconds=3):
    """Transaction_generator에서 거래 데이터를 3초 간격으로 전달하는 생성기를 반환합니다."""
    # TODO: DB화 이후에는 file_path 대신 DB query/streaming source를 받도록 수정
    return transaction_generator(file_path=file_path, interval_seconds=interval_seconds)

class FraudAnalyzer:

    def __init__(self):
        # 1. 미리 학습된 모델 로드
        self.model = model_manager.load_existing_model()
        if self.model is None:
            raise FileNotFoundError("학습된 모델 파일이 없습니다! 먼저 학습을 진행해 주세요.")
            
        # 2. SHAP Explainer 초기화 (트리 모델 전용 TreeExplainer 사용)
        self.explainer = shap.TreeExplainer(self.model)

        # 3. 연쇄 자금세탁 패턴 추적용 메모리
        #    동일 nameDest로 들어온 금액이 바로 다음 step에서 CASH_OUT으로 빠져나가는지 감지
        self.transfer_history = {}

    # 한 건의 거래 데이터를 받아 탐지하고 Qwen용 근거 데이터 생성
    def analyze_transaction(self, raw_tx_data):

        # 실시간 분석 시각 기록
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')

        # 거래 핵심 필드
        orig_acc = raw_tx_data.get('nameOrig')  # 송신자 계좌
        dest_acc = raw_tx_data.get('nameDest')  # 수신자 계좌
        step = int(raw_tx_data.get('step', 0))
        tx_type = raw_tx_data.get('type', '')
        amount = float(raw_tx_data.get('amount', 0.0))
        oldbalance_org = float(raw_tx_data.get('oldbalanceOrg', 0.0))
        newbalance_orig = float(raw_tx_data.get('newbalanceOrig', 0.0))

        # 1. 블랙리스트 판별: split_3.csv의 is_blacklist 값 우선 사용
        blacklist_flag = raw_tx_data.get('is_blacklist')
        if blacklist_flag is not None:
            try:
                flag_value = int(blacklist_flag)
            except (ValueError, TypeError):
                flag_value = 0

            is_orig_black = flag_value in (1, 3)
            is_dest_black = flag_value in (2, 3)
        else:
            # TODO: DB화 이후에는 raw_tx_data의 블랙리스트 유무 대신
            #       DB 블랙리스트 테이블을 조회하는 함수로 대체해야 합니다.
            # 예: is_orig_black = self.blacklist_service.is_blacklisted(orig_acc)
            #     is_dest_black = self.blacklist_service.is_blacklisted(dest_acc)
            is_orig_black = orig_acc in preprocess.BLACKLIST_ACCOUNTS
            is_dest_black = dest_acc in preprocess.BLACKLIST_ACCOUNTS

        # 2. 보이스피싱 의심 패턴: 잔고 전체를 이체하고 남은 잔고가 0인 경우
        is_phishing_pattern = amount == oldbalance_org and newbalance_orig == 0

        # 3. 고액 자금세탁 연쇄 패턴: 이전 TRANSFER 수신 계좌가 곧바로 CASH_OUT하는지 추적
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
                        'desc': f"{orig_acc} 계좌가 TRANSFER 후 {step - prev_step} step 이내 CASH_OUT 수행"
                    }

        # 4. 현재 거래가 TRANSFER이면 연쇄 탐지를 위해 기록 유지
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
                evidence.append({"column": "nameOrig", "contribution": 10.0, 
                                 "actual_value": orig_acc, "desc": "⚠️블랙리스트에 등록된 송신자 식별⚠️"})
            if is_dest_black:
                evidence.append({"column": "nameDest", "contribution": 10.0, 
                                 "actual_value": dest_acc, "desc": "⚠️블랙리스트에 등록된 수신자 식별⚠️"})
            if is_phishing_pattern:
                evidence.append({"column": "phishing_pattern", "contribution": 10.0,
                                 "actual_value": amount,
                                 "desc": "⚠️ 보이스피싱 의심: 전액 송금 후 잔고 0"})
            if is_chain_laundering and laundering_evidence is not None:
                evidence.append(laundering_evidence)
            return {
                "is_suspicious": bool(rule_suspicion),
                "fraud_probability": 0.0,
                "is_blacklist": is_blacklist,
                "evidence_materials": evidence,
                "raw_data": raw_tx_data,
                "note": "AI 분석 제외 유형이나 블랙리스트 계좌 포함됨"
            }

        # 모델 입력에 불필요한 컬럼 제거('TRANSFER', 'CASH_OUT'을 제외한 컬럼에 대한 내용이 전달되면 제외시키고 학습)
        X_tx = processed_tx.drop(['isFraud', 'isFlaggedFraud', 'nameOrig', 'nameDest'], axis=1, errors='ignore')
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

        # 기여도 절댓값 기준 상위 3개만 추출 (단, nameOrig, nameDest는 제외)
        top_evidence = [
                e for e in sorted(evidence_list, key=lambda x: abs(x['contribution']), reverse=True)
                if e['column'] not in ['nameOrig', 'nameDest']
            ][:3]
        
        # *최종 분석 결과 구성*
        tx_analysis = {
                "timestamp": timestamp,
                "is_suspicious": bool(rule_suspicion or prob > 0.8), # 모델 예측+사전 규칙 결합
                "risk_score": round(float(prob), 4),
                "fraud_probability": round(float(prob), 4),
                "is_blacklist": is_blacklist,
                "evidence": top_evidence,
                "evidence_materials": top_evidence,
                "info": raw_tx_data
            }

        # 규칙 탐지 근거를 최상단에 삽입
        if is_phishing_pattern:
            tx_analysis["evidence"].insert(0, {
                "feature": "phishing_pattern", "score": 10.0, "value": amount,
                "desc": "⚠️ 보이스피싱 의심: 잔액 전체 송금 후 잔고 0"
            })
        if is_chain_laundering and laundering_evidence is not None:
            tx_analysis["evidence"].insert(0, laundering_evidence)
        if is_orig_black:
            tx_analysis["evidence"].insert(0, {
                "feature": "nameOrig", "score": 10.0, "value": orig_acc, "desc": "⚠️블랙리스트 송신자 식별"
            })
        if is_dest_black:
            tx_analysis["evidence"].insert(0, {
                "feature": "nameDest", "score": 10.0, "value": dest_acc, "desc": "⚠️블랙리스트 수신자 식별"
            })
            
        return tx_analysis


#? XGBoost 머신러닝 실행 코드
if __name__ == "__main__":
    analyzer = FraudAnalyzer()
    
    print("🛰️ 실시간 의심 거래 탐지 엔진 가동 중...")
    
    for current_tx in get_realtime_transaction_history():
        # 2. 탐지 및 분석 수행
        result = analyzer.analyze_transaction(current_tx)

        if result["is_suspicious"]:
            print(f"🚨 [의심거래 발견] 확률: {result['risk_score'] * 100}%")
            print(f"📊 의심거래 근거 데이터 : {result['evidence']}")
            # 여기서 다른 팀원(Qwen 담당)의 함수를 호출하거나 DB/Queue에 저장