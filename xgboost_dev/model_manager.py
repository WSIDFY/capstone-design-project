import os
import xgboost as xgb

#? [학습이 완료된 AI모델의 저장 및 로드 관련 코드]

# XGBoost가 학습한 수학적 가중치와 결정 트리(Decision Tree) 구조를 포함한 데이터가 저장된 AI모델 저장
MODEL_DIR = 'models'
MODEL_PATH = os.path.join(MODEL_DIR, 'fds_xgb_model.json')

# 학습된 모델 저장
def save_model(model):
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)
    
    model.save_model(MODEL_PATH)
    print(f"모델 저장 완료: {MODEL_PATH}")

# 저장된 모델이 있으면 불러오고, 없으면 None반환
def load_existing_model():
    if os.path.exists(MODEL_PATH):
        print(f"기존 모델 로드 중: {MODEL_PATH}")
        model = xgb.XGBClassifier()
        model.load_model(MODEL_PATH)
        return model
    
    return None