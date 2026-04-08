import preprocess
import train
import model_manager
import os
import time  # 실시간 간격 조절용
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, average_precision_score
from basis_generator import FraudAnalyzer

#? [AI모델 성능 검증 및 실행 코드 파일]

def analyze_model_weights(model):
    print("\n🔍 모델 피처 중요도 분석 중...")
    
    # 1. Gain: 해당 피처가 노드를 분리할 때 줄인 '불순도'의 총합 (가장 신뢰도 높음)
    importance_gain = model.get_booster().get_score(importance_type='gain')
    
    # 3. 상위 가중치 출력
    sorted_gain = sorted(importance_gain.items(), key=lambda x: x[1], reverse=True)
    print("Top 5 결정적 피처 (수학적 가중치 순):")
    for i, (feat, score) in enumerate(sorted_gain[:5], 1):
        print(f"{i}. {feat}: {score:.2f}")

def run_project():
    # 1. 기존 모델 존재 여부 확인 (model_manager 활용)
    model = model_manager.load_existing_model()
    
    if model is not None:
        print("기존 학습된 모델 사용(학습 단계 스킵)")
        #*피처 중요도 분석 그래프 확인(아래 코드의 주석을 풀고 가동하면 확인 가능)
        #analyze_model_weights(model)
    else:
        print("기존 학습된 모델이 없음(전처리 및 신규 학습 시작)")
        
        # [사전 학습 데이터 병합 로드]
        train_files = ['data/split_0.csv', 'data/split_1.csv']
        combined_df = pd.concat([preprocess.load_paysim_data(f) for f in train_files])
        
        processed_df = preprocess.engineer_features(combined_df)
        weight = preprocess.check_imbalance(processed_df)
        
        X = processed_df.drop(['isFraud', 'isFlaggedFraud', 'nameOrig', 'nameDest'], axis=1, errors='ignore')
        y = processed_df['isFraud']
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        
        model = train.train_xgb_model(X_train, y_train, weight)
        model_manager.save_model(model)
        
        # 성능 확인 (초기 1회)
        probs = model.predict_proba(X_test)[:, 1]
        print(f"✅ 초기 모델 AUPRC: {average_precision_score(y_test, probs):.4f}")


    # 3. 모델이 존재할 경우: 실시간 감시 엔진 가동 (split_2, 3 대상)
    print("\n 실시간 의심거래 탐지 엔진 모드로 전환합니다.")
    
    #! [다른 팀원이 구현할 데이터 수신 로직 시뮬레이션]
    #! 임시 변수: 수신된 거래 내역 (예: 타 팀원이 보낸 데이터 1건)
    #! incoming_data = get_data_from_team_generator() 

    # 실제 시연을 위한 루프 예시 (split_2, 3 사용)}
    monitor_realtime(model)

def monitor_realtime(model):    # 실제 시연을 위한 루프
    """
    [핵심] 실시간으로 데이터를 받아 처리하는 내부 루프
    """
    analyzer = FraudAnalyzer() 

    print("👀 거래 내역 수신 대기 중 (3초 간격)...")
    
    # 임시로 split_2를 읽어서 한 줄씩 처리하는 예시
    test_data = pd.read_csv('data/split_2.csv') 
    
    for i in range(len(test_data)):
        # 1건 추출하여 딕셔너리로 변환
        current_tx = test_data.iloc[i].to_dict() 
        
        # [수정 포인트 3] analyzer를 통해 탐지 및 근거 생성 한 번에 처리
        result = analyzer.analyze_transaction(current_tx)
        
        if result["is_suspicious"]:
            print(f"🚨 [의심거래 포착] 사기 확률: {result['fraud_probability'] * 100:.2f}%")
            print(f"📊 Qwen 전달 근거 재료: {result['evidence_materials']}")
        else:
            print(f"🟢 정상 거래 통과 (확률: {result['fraud_probability'] * 100:.2f}%)")
        
        time.sleep(3) # 3초 대기

# 코드 실행
if __name__ == "__main__":
    run_project()