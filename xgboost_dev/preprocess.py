import pandas as pd
import numpy as np
import os

#? [데이터 전처리 파이프라인 파일 & 블랙리스트 계좌 관리]
#? 주요 기능 : 데이터 로딩, 자료형 최적화(float32 등), 블랙리스트 관리, 파생 변수(잔액 오류 등) 생성

# TODO: DB화 이후에는 이 CSV 경로 대신 DB 조회 함수로 교체
DATA_PATH = os.path.join('data', 'paysim_data.csv')

# 컬럼별 데이터 타입 지정
# TODO: DB화 후 이 함수는 DB에서 거래 데이터를 읽어오는 쿼리/ORM 호출로 교체
def load_paysim_data(file_path, is_training=True):
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
    # 파일 존재 여부 확인
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")
    # 파일이 존재한다면 데이터 로딩
    if is_training:
        print(f"데이터 로딩 중: {file_path}")
    df = pd.read_csv(file_path, dtype=dtypes)

    return df

# 이상거래 식별 시나리오 4가지를 모델이 학습 가능하도록 파생 변수 생성
# 현재 거래 데이터에 is_blacklist 컬럼이 포함되어 있으므로, 해당 값에서 블랙리스트 여부를 파생합니다.
# TODO: DB화 이후에는 is_blacklist 값이 DB 조회 또는 캐시로부터 공급되는지 확인 필요
def engineer_features(df, is_training=False):
    if is_training:
        print("피처 엔지니어링 진행 중...")

    # type 칼럼을 강제로 category 타입으로 변환
    if 'type' in df.columns:
        df['type'] = df['type'].astype('category')

    # 송신자와 수신자 각각 블랙리스트 여부를 표시
    if 'is_blacklist' in df.columns:
        blacklist_values = df['is_blacklist'].fillna(0).astype(int)
        df['is_blacklist_orig'] = blacklist_values.isin([1, 3]).astype(int)
        df['is_blacklist_dest'] = blacklist_values.isin([2, 3]).astype(int)
    else:
        df['is_blacklist_orig'] = 0
        df['is_blacklist_dest'] = 0

    # 1. 계좌 잔액 오류 판별 (newbalance = oldbalance - amount)
    df['errorBalanceOrig'] = df['newbalanceOrig'] + df['amount'] - df['oldbalanceOrg']
    df['errorBalanceDest'] = df['oldbalanceDest'] + df['amount'] - df['newbalanceDest']
    
    # 2. 핵심 사기 유형 필터링 (TRANSFER, CASH_OUT)
    df_filtered = df[df['type'].isin(['TRANSFER', 'CASH_OUT'])].copy()  # 해당 칼럼에만 이상거래가 포함되어있음
    
    df_filtered['type'] = df_filtered['type'].cat.remove_unused_categories()

    # 3. 범주형 데이터 인코딩 (XGBoost 입력용)
    # 'type' 컬럼을 숫자로 변환 (TRANSFER: 0, CASH_OUT: 1)
    df_filtered['type'] = df_filtered['type'].cat.codes
    
    return df_filtered


# 학습 전 isFraud 라벨의 비율을 확인하여 scale_pos_weight값(가중치)을 결정
def check_imbalance(df, is_training=True):
    fraud_count = df['isFraud'].sum()
    total_count = len(df)
    ratio = (fraud_count / total_count) * 100
    
    # 불균형 데이터 처리를 위한 가중치의 계산(사기 거래가 적을수록 가중치 증가)
    scale_pos_weight = (total_count - fraud_count) / fraud_count
    
    if is_training:
        print(f"분석 결과:")
        print(f" - 전체 거래 수: {total_count:,}건")
        print(f" - 사기 거래 수: {fraud_count:,}건")
        print(f" - 사기 거래 비율: {ratio:.4f}%")
        print(f" - 추천 scale_pos_weight: {scale_pos_weight:.2f}")
    return scale_pos_weight


