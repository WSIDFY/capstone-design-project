import preprocess
import train
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, average_precision_score

def run_project():
    # 1. 전처리 파트
    DATA_PATH = 'data/paysim_data.csv'
    raw_df = preprocess.load_paysim_data(DATA_PATH)
    processed_df = preprocess.engineer_features(raw_df)
    weight = preprocess.check_imbalance(processed_df)
    
    # 2. 데이터 분할
    X = processed_df.drop(['isFraud', 'isFlaggedFraud', 'nameOrig', 'nameDest'], axis=1, errors='ignore')
    y = processed_df['isFraud']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # 3. 학습 파트 (train.py 호출)
    model = train.train_xgb_model(X_train, y_train, weight)
    
    # 4. 평가 파트
    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1]
    
    print("\n" + "="*30)
    print("📊 최종 모델 평가 보고서")
    print("="*30)
    print(classification_report(y_test, preds))
    print(f"AUPRC (Average Precision): {average_precision_score(y_test, probs):.4f}")

if __name__ == "__main__":
    run_project()