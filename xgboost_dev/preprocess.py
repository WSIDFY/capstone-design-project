import pandas as pd
import numpy as np
import os

#? [데이터 전처리 파이프라인 파일 & 블랙리스트 계좌 관리]

# 상대 경로를 사용하여 data 폴더 내 파일 지정
DATA_PATH = os.path.join('data', 'paysim_data.csv')

# *컬럼별 데이터 타입 지정*
def load_paysim_data(file_path):
    # 메모리 절약을 위해 데이터 타입 지정 (float64 -> float32)
    dtypes = {
        'step': np.int32,
        'type': 'category',
        'amount': np.float32,
        'oldbalanceOrg': np.float32,
        'newbalanceOrig': np.float32,
        'oldbalanceDest': np.float32,
        'newbalanceDest': np.float32,
        'isFraud': np.int8,
        'isFlaggedFraud': np.int8
    }
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"❌ 파일을 찾을 수 없습니다: {file_path}")

    print(f"데이터 로딩 중: {file_path}")
    df = pd.read_csv(file_path, dtype=dtypes)

    return df

#! 블랙리스트 계좌 리스트 정의 (현재 5개의 사용자)
BLACKLIST_ACCOUNTS = {'C787055130', 'C773093019', 'C900990754', 'M1564482630', 'M2026717640'}

# *이상거래 식별 시나리오 4가지를 모델이 학습 가능하도록 파생 변수 생성*
def engineer_features(df):
    print("피처 엔지니어링 진행 중...")

    # type 칼럼을 강제로 category 타입으로 변환
    if 'type' in df.columns:
        df['type'] = df['type'].astype('category')

    # 송금 받는 계좌(nameDest)가 "블랙리스트"에 포함되어 있는지 확인
    df['is_blacklist_dest'] = df['nameDest'].isin(BLACKLIST_ACCOUNTS).astype(int)

    # 1. 계좌 잔액 오류 (newbalance = oldbalance - amount)
    df['errorBalanceOrig'] = df['newbalanceOrig'] + df['amount'] - df['oldbalanceOrg']
    df['errorBalanceDest'] = df['oldbalanceDest'] + df['amount'] - df['newbalanceDest']
    
    # 2. 핵심 사기 유형 필터링 (TRANSFER, CASH_OUT)
    df_filtered = df[df['type'].isin(['TRANSFER', 'CASH_OUT'])].copy()  # 해당 칼럼에만 이상거래가 포함되어있음
    
    df_filtered['type'] = df_filtered['type'].cat.remove_unused_categories()

    # 3. 범주형 데이터 인코딩 (XGBoost 입력용)
    # 'type' 컬럼을 숫자로 변환 (TRANSFER: 0, CASH_OUT: 1)
    df_filtered['type'] = df_filtered['type'].cat.codes
    
    return df_filtered


# *학습 전 isFraud 라벨의 비율을 확인하여 scale_pos_weight값(가중치)을 결정*
def check_imbalance(df):
    fraud_count = df['isFraud'].sum()
    total_count = len(df)
    ratio = (fraud_count / total_count) * 100
    
    scale_pos_weight = (total_count - fraud_count) / fraud_count
    
    print(f"✅ 분석 결과:")
    print(f" - 전체 거래 수: {total_count:,}건")
    print(f" - 사기 거래 수: {fraud_count:,}건")
    print(f" - 사기 거래 비율: {ratio:.4f}%")
    print(f" - 추천 scale_pos_weight: {scale_pos_weight:.2f}")
    return scale_pos_weight


