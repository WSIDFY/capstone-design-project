import xgboost as xgb 

#? [AI모델 학습 관련 코드]
#? 주요 기능: XGBoost 모델 정의 및 학습과 학습된 모델의 저장/로드

# 학습된 모델 저장
def train_xgb_model(X_train, y_train, scale_weight):
    """XGBoost 모델을 정의하고 학습시킨 후 반환합니다."""
    print(f"XGBoost 학습 엔진 가동 (가중치: {scale_weight:.2f})")
    
    # 모델 정의
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        scale_pos_weight=scale_weight,      # 가중치 값 336.32 대입
        use_label_encoder=False,
        eval_metric='aucpr',
        random_state=42
    )

    # 모델 학습 실행
    model.fit(X_train, y_train)
    return model