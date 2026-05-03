import preprocess
import train
import model_manager
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, average_precision_score
from basis_generator import FraudAnalyzer
from Transaction_generator import transaction_generator     #TODO: 추후에 개발된 DB에서 실시간 거래를 읽어오는 생성기 함수로 대체

#? [AI모델 성능 검증 및 실행 코드 파일(기존, 신규 모델 분기처리), 가중치 책정]
#? 주요 기능: 전체 파이프라인 제어(학습/로드 분기) 및 실시간 탐지 시뮬레이션 루프 실행

# 모델의 피처 중요도 분석 (학습된 모델이 있을 때만 실행)
def analyze_model_weights(model):
    print("\n🔍 모델 피처 중요도 분석 중...")
    
    # Gain: 해당 피처가 노드를 분리할 때 줄인 '불순도'의 총합 (가장 신뢰도 높음)
    importance_gain = model.get_booster().get_score(importance_type='gain')
    
    # 상위 가중치 출력
    sorted_gain = sorted(importance_gain.items(), key=lambda x: x[1], reverse=True)
    print("Top 5 결정적 피처 (수학적 가중치 순):")
    for i, (feat, score) in enumerate(sorted_gain[:5], 1):
        print(f"{i}. {feat}: {score:.2f}")

# 전체 프로젝트 실행 함수
def run_project():
    # 1. 기존 모델 존재 여부 확인 (model_manager 활용)
    model = model_manager.load_existing_model()
    
    if model is not None:
        print("기존 학습된 모델 사용(학습 단계 스킵)")
        #*피처 중요도 분석 그래프 확인(아래 코드의 주석을 풀고 가동하면 확인 가능)
        #analyze_model_weights(model)

    # 2. 모델이 없을 경우: 데이터 전처리 및 신규 학습 진행
    else:
        print("기존 학습된 모델이 없음(전처리 및 신규 학습 시작)")
        
        # [사전 학습 데이터 병합 로드]
        train_files = ['data/split_0.csv', 'data/split_1.csv', 'data/split_2.csv']
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
        print(f"초기 모델 AUPRC: {average_precision_score(y_test, probs):.4f}")

    # 3. 모델이 존재할 경우: 실시간 탐지 엔진 가동
    print("\n 실시간 의심거래 탐지를 시작합니다.")

    # 실제 시연을 위한 루프 예시 (split_3 사용)}
    monitor_realtime(model)

def monitor_realtime(model):    # 실제 시연을 위한 루프

    analyzer = FraudAnalyzer() 

    print("거래 내역 수신 대기 중...")
    
    for current_tx in transaction_generator():
        # [수정 포인트 3] analyzer를 통해 탐지 및 근거 생성 한 번에 처리
        result = analyzer.analyze_transaction(current_tx)
        
        if result["is_suspicious"]:
            print(f"[이상거래 포착] 사기 확률: {result['risk_score'] * 100:.2f}%")
            print(f"근거 재료: {result['evidence']}")
            
            #! [Qwen 연동 코드 작성]
            # result 안에는 다음 정보가 모두 포함됨:
            #   - timestamp: 거래 수신 시각
            #   - is_suspicious: 의심거래 판정
            #   - is_blacklist: 블랙리스트 여부
            #   - risk_score: 사기 확률
            #   - evidence: 근거 데이터 (상위 3개 피처)
            #   - info: 원본 거래 정보
            # 예: qwen_response = send_to_qwen(result)
            pass

        else:
            print(f"정상 거래(확률: {result['risk_score'] * 100:.2f}%)")

# 코드 실행
if __name__ == "__main__":
    run_project()