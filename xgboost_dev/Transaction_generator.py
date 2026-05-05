import time
import pandas as pd
import datetime

# [테스트용 거래 데이터 생성기]
# 주요 기능: split_3.csv 파일을 1건씩 읽어와 3초 간격으로 전달하는 생성기
# 추후 별도 개발된 거래 생성기로 대체될 예정
# DB화 시에는 이 모듈이 DB 커넥션/ORM 호출을 통해 실시간 거래를 읽어오는 부분으로 대체 예정

# 실제 운영에서는 FDS_AML에서 거래가 발생할 때마다 해당 거래 데이터를 이 모듈로 전달하여 분석
def transaction_generator(file_path='data/split_3.csv', interval_seconds=3):
    df = pd.read_csv(file_path)

    for _, row in df.iterrows():
        transaction_info = {
            'step': int(row.get('step', 0)),
            'type': row.get('type', ''),
            'amount': int(row.get('amount', 0.0)),  # DTO에 맞춰 Integer로 변환
            'sender': row.get('nameOrig', ''),  # DTO의 sender 필드에 맞춤
            'oldbalanceOrg': float(row.get('oldbalanceOrg', 0.0)),
            'newbalanceOrig': float(row.get('newbalanceOrig', 0.0)),
            'receiver': row.get('nameDest', ''),  # DTO의 receiver 필드에 맞춤
            'oldbalanceDest': float(row.get('oldbalanceDest', 0.0)),
            'newbalanceDest': float(row.get('newbalanceDest', 0.0)),
            'is_blacklist': row.get('is_blacklist', 0),
        }

        yield transaction_info
        time.sleep(interval_seconds)


if __name__ == "__main__":
    print("Transaction_generator 실행: split_3.csv 데이터를 3초 간격으로 전달합니다.")
    for tx in transaction_generator():
        print(tx)
