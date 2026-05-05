from typing import Any, Dict, List, Union

import pandas as pd
import preprocess
import train
import model_manager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sklearn.model_selection import train_test_split
from sklearn.metrics import average_precision_score
from basis_generator import FraudAnalyzer
import uvicorn

app = FastAPI()

# AI모델 성능 검증 및 실행 코드 파일(기존, 신규 모델 분기처리), 가중치 책정
class EvidenceMaterial(BaseModel):
    column: str
    contribution: float
    actual_value: Union[str, int, float, bool]
    desc: str


class TransactionRequest(BaseModel):
    step: int
    type: str
    amount: Union[int, float]
    sender: str
    oldbalanceOrg: float
    newbalanceOrig: float
    receiver: str
    oldbalanceDest: float
    newbalanceDest: float
    transactionDate: str

    class Config:
        extra = "allow"


class AiAnalysisResponse(BaseModel):
    is_suspicious: bool
    fraud_probability: float
    is_blacklist: bool
    evidence_materials: List[EvidenceMaterial]
    raw_data: Dict[str, Any]

#? [AI모델 성능 검증 및 실행 코드 파일(기존, 신규 모델 분기처리), 가중치 책정]
#? 주요 기능: 전체 파이프라인 제어(학습/로드 분기) 및 실시간 탐지 API 서버 실행

# 모델의 피처 중요도 분석 (학습된 모델이 있을 때만 실행)
def analyze_model_weights(model):
    print("\n 모델 피처 중요도 분석 중...")
    
    # Gain: 해당 피처가 노드를 분리할 때 줄인 '불순도'의 총합 (가장 신뢰도 높음)
    importance_gain = model.get_booster().get_score(importance_type='gain')
    
    # 상위 가중치 출력
    sorted_gain = sorted(importance_gain.items(), key=lambda x: x[1], reverse=True)
    print("Top 5 결정적 피처 (수학적 가중치 순):")
    for i, (feat, score) in enumerate(sorted_gain[:5], 1):
        print(f"{i}. {feat}: {score:.2f}")

# 모델이 존재하면 로드, 없으면 학습 후 저장
def train_model():
    print("기존 학습된 모델이 없음(전처리 및 신규 학습 시작)")
    train_files = ['data/split_0.csv', 'data/split_1.csv', 'data/split_2.csv']
    combined_df = pd.concat([preprocess.load_paysim_data(f) for f in train_files])
    processed_df = preprocess.engineer_features(combined_df)
    weight = preprocess.check_imbalance(processed_df)
    X = processed_df.drop(['isFraud', 'isFlaggedFraud', 'sender', 'receiver'], axis=1, errors='ignore')
    y = processed_df['isFraud']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    model = train.train_xgb_model(X_train, y_train, weight)
    model_manager.save_model(model)
    probs = model.predict_proba(X_test)[:, 1]
    print(f"초기 모델 AUPRC: {average_precision_score(y_test, probs):.4f}")


def initialize_analyzer() -> FraudAnalyzer:
    if model_manager.load_existing_model() is None:
        train_model()
    return FraudAnalyzer()

# 실시간 거래 분석 API
def convert_evidence_materials(evidence_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    materials: List[Dict[str, Any]] = []
    for item in evidence_list:
        if 'column' in item:
            column_name = item['column']
            contribution = float(item.get('contribution', 0.0))
            actual_value = item.get('actual_value', 'N/A')
            desc = item.get('desc') or str(column_name)
        elif 'feature' in item:
            column_name = item['feature']
            contribution = float(item.get('score', 0.0))
            actual_value = item.get('value', 'N/A')
            desc = item.get('desc') or str(column_name)
        else:
            column_name = str(item.get('column', 'unknown'))
            contribution = float(item.get('contribution', 0.0))
            actual_value = item.get('actual_value', 'N/A')
            desc = item.get('desc') or str(column_name)

        materials.append({
            'column': column_name,
            'contribution': contribution,
            'actual_value': actual_value,
            'desc': desc
        })
    return materials


@app.on_event("startup")
async def startup_event():
    app.state.analyzer = initialize_analyzer()
    print("AI 서버 준비 완료: 모델 로드 및 FraudAnalyzer 생성 완료")


@app.get("/health")
def health_check():
    return {"status": "ok"}

# 실시간 거래 분석 API 엔드포인트
@app.post("/predict", response_model=AiAnalysisResponse)
def predict(transaction: TransactionRequest):
    analyzer: FraudAnalyzer = app.state.analyzer
    raw_tx_data = transaction.dict()

    try:
        result = analyzer.analyze_transaction(raw_tx_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"거래 분석 중 오류가 발생했습니다: {e}")

    evidence_materials = convert_evidence_materials(result.get('evidence', []))
    return {
        'is_suspicious': result['is_suspicious'],
        'fraud_probability': result['risk_score'],
        'is_blacklist': result['is_blacklist'],
        'evidence_materials': evidence_materials,
        'raw_data': result.get('info', raw_tx_data)
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)

