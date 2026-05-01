import time
import pandas as pd
import numpy as np
import shap
import model_manager
import preprocess
import datetime

#? [데이터를 받아와서 학습 된 모델을 토대로 검증 후 근거데이터 생성]
#? 주요 기능: 실시간 거래 분석, SHAP 기반 기여도 산출, 블랙리스트 즉시 판별 및 근거 데이터 생성

#! [추후 명세 후 수정]----------------------------------------
#! 실시간 거래 내역을 받아오는 가상의 변수/함수
#! 데이터 형식: {'step': 1, 'type': 'TRANSFER', 'amount': 150000, ...} 
#! ---------------------------------------------------------

def get_realtime_transaction_history():
    #! [추후 명세 후 수정]---------------------------------------
    #! 구현 될 제네레이터 혹은 API로부터 데이터를 수신하는 함수 (임시)
    #! 실제 구현 시에는 여기서 프론트/서버로부터 넘어온 JSON 데이터 받아오기
    #! ---------------------------------------------------------
    # return data_from_generator
    pass

class FraudAnalyzer:

    def __init__(self):
        # 1. 미리 학습된 모델 로드
        self.model = model_manager.load_existing_model()
        if self.model is None:
            raise FileNotFoundError("학습된 모델 파일이 없습니다! 먼저 학습을 진행해 주세요.")
            
        # 2. SHAP Explainer 초기화 (트리 모델 전용 TreeExplainer 사용)
        self.explainer = shap.TreeExplainer(self.model)

    # 한 건의 거래 데이터를 받아 탐지하고 Qwen용 근거 데이터 생성
    def analyze_transaction(self, raw_tx_data):

        # 실시간 분석 시각 기록
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')

        # 양방향 블랙리스트 즉시 판별
        orig_acc = raw_tx_data.get('nameOrig') # 송신자 계좌
        dest_acc = raw_tx_data.get('nameDest')  # 수신자 계좌
        
        # 송/수신자가 블랙리스트인지 판별
        is_orig_black = orig_acc in preprocess.BLACKLIST_ACCOUNTS
        is_dest_black = dest_acc in preprocess.BLACKLIST_ACCOUNTS
        
        # 송/수신자 중 블랙리스트에 속한 사용자가 있다면 의심거래내역으로 분류
        is_blacklist = is_orig_black or is_dest_black

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
            return {
                "is_suspicious": is_blacklist,
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
                "is_suspicious": bool(prob > 0.8 or is_blacklist), #! 확률이 80% 이상이거나 블랙리스트에 포함된 경우
                "risk_score": round(float(prob), 4),
                "is_blacklist": is_blacklist,   #! 수정 예정
                "evidence": top_evidence, # SHAP 근거 (중복 제거됨)
                "info": raw_tx_data       # 원본 데이터
            }

        # 블랙리스트 근거를 최상단에 삽입 (명칭 변경 반영)
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
    
    while True:
        # 1. 데이터 수신 (팀원이 구현할 부분에서 데이터 획득)
        # current_tx = get_realtime_transaction_history()
        
        # 테스트용 임시 데이터 예시 (제네레이터가 3초마다 줄 데이터 형태)
        current_tx = {
            'step': 1, 'type': 'TRANSFER', 'amount': 10000000, 
            'oldbalanceOrg': 10000000, 'newbalanceOrig': 0,
            'oldbalanceDest': 0, 'newbalanceDest': 0
        }

        # 2. 탐지 및 분석 수행
        result = analyzer.analyze_transaction(current_tx)

        if result["is_suspicious"]:
            print(f"🚨 [의심거래 발견] 확률: {result['risk_score'] * 100}%")
            print(f"📊 의심거래 근거 데이터 : {result['evidence']}")
            # 여기서 다른 팀원(Qwen 담당)의 함수를 호출하거나 DB/Queue에 저장
        
        time.sleep(3) # 3초 간격 대기 로직 (팀원 로직과 동기화)