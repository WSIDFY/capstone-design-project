import pandas as pd
import requests
import json
from datetime import datetime
import random
import time

FILES = ['split_3.csv'] 
API_URL = "http://localhost:8080/transactions"

def run_generator():
    for file_name in FILES:
        print(f"관제 시뮬레이션 시작 {file_name} 찐 실시간 데이터 전송 중...")
        try:
            df = pd.read_csv(file_name) 
        except FileNotFoundError:
            print(f"파일을 찾을 수 없습니다")
            continue

        for index, row in df.iterrows():
            current_real_time = datetime.now()
            
            payload = {
                "step": int(row['step']),
                "type": row['type'],
                "amount": float(row['amount']),
                "sender": row['nameOrig'],
                "oldbalanceOrg": float(row['oldbalanceOrg']),
                "newbalanceOrig": float(row['newbalanceOrig']),
                "receiver": row['nameDest'],
                "oldbalanceDest": float(row['oldbalanceDest']),
                "newbalanceDest": float(row['newbalanceDest']),
                "transactionDate": current_real_time.strftime('%Y-%m-%d %H:%M:%S') 
            }

            try:
                headers = {'Content-Type': 'application/json'}
                response = requests.post(API_URL, data=json.dumps(payload), headers=headers)
                
                if index % 100 == 0:
                    print(f"{index}번째 전송 완료 실제 찍힌 시간 {payload['transactionDate']}")
            except Exception as e:
                print(f"백엔드 연결 실패 서버 켜졌는지 확인해봐 {e}")
                break
            
            time.sleep(random.uniform(1.0, 3.0))

if __name__ == "__main__":
    run_generator()