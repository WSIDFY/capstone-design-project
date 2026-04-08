import xgboost as xgb

#? [AI모델 학습 관련 코드]

def train_xgb_model(X_train, y_train, scale_weight):
    """XGBoost 모델을 정의하고 학습시킨 후 반환합니다."""
    print(f"🚀 XGBoost 학습 엔진 가동 (가중치: {scale_weight:.2f})")
    
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        scale_pos_weight=scale_weight,      # 가중치 값 336.32 대입
        use_label_encoder=False,
        eval_metric='aucpr',
        random_state=42
    )
    
    model.fit(X_train, y_train)
    return model