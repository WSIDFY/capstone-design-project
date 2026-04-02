# paysim데이터셋 칼럼명 확인용 코드
import pandas as pd
import os

DATA_PATH = os.path.join('data', 'paysim_data.csv')

def print_columns(file_path):
    try:
        # 데이터는 읽지 않고 헤더(컬럼명)만 가져옴
        df_header = pd.read_csv(file_path, nrows=0)
        columns = df_header.columns.tolist()
        
        print(f"\n🔍 파일명: {os.path.basename(file_path)}")
        print(f"✅ 총 컬럼 수: {len(columns)}개")
        print("-" * 30)
        for i, col in enumerate(columns, 1):
            print(f"{i}. {col}")
        print("-" * 30)
        
    except FileNotFoundError:
        print("❌ 에러: 파일을 찾을 수 없습니다. 경로를 확인해주세요.")
    except Exception as e:
        print(f"❌ 에러 발생: {e}")

if __name__ == "__main__":
    print_columns(DATA_PATH)

# 실행 코드(첫 번째 줄만 출력)
# head -n 1 data/paysim_data.csv