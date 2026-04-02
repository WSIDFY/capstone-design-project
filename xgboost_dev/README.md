# 이상금융거래(FDS) 및 자금세탁(AML) 탐지 서비스 개발
- 추가 예정입니다.

---
### 프로젝트 개요
- 추가 예정입니다.

---
### 프로젝트 목표
- 추가 예정입니다.

---
#### 주요 라이브러리
- **xgboost**: 실시간 사기 탐지 핵심 엔진.
- **pandas/numpy**: PaySim 데이터셋 핸들링.
- **shap**: "왜 이 거래가 사기인가?"에 대한 근거 추출 (Qwen 리포트 생성용).
- **fastapi/uvicorn**: 실시간 탐지 API 서버 구축.
- **python-dotenv**: API 키 등 보안 설정 관리.
- **dashscope**: Qwen 2.5/3 모델 API 연동 라이브러리 (Alibaba Cloud).


#### 진행도 관련
[26.04.02]
1. 파이썬 가상환경 생성
2. 필요 라이브러리 설치
    1. 정상적으로 설치 됐는지 테스트 코드 구동 및 확인 완료
3. 데이터 전처리 파이프라인 수립(preprocess.py)
    1. 메모리 최적화 함수 : load_paysim_data
    2. 파생 변수 생성 함수 : engineer_features
    3. 불균형 식별 함수 : check_imbalance
        1. 사기 거래가 약 **0.3%**에 불과하다는 점을 수치로 증명하고, 이를 보완할 가중치(`scale_pos_weight`) 계산 로직
4. AI 모델 학습 및 성능 검증(`train.py`, `main.py`)
    - XGBoost 모델이 실제 데이터를 학습하여 **AUPRC 0.9939** 성능 지표 확인
    - 테스트 데이터 내 사기 거래의 100% 탐색(Recall 1.00) 확인

(참고)
![column_name.png](.\xgboost_dev\img\column_name.png)
-> 데이터 파일이 너무 커서 원본 확인이 어려운 관계로 컬럼명을 추출하는 코드를 통해 직접 컬럼 명을 확인
![model_score](.\xgboost_dev\img\model_score.png)
-> 현재 작성된 AI 모델 학습 결과(정상 및 이상거래내역의 비율 및 수치에 집중, 근거 데이터X)

→ 예정 테스크
- **SHAP 분석**: 모델 내부에서 어떤 피처(예: 송금액, 잔액 오류 등)가 결정적이었는지 수치화.
- **Qwen 개발 환경 설정 및 리포팅 기능 추가** : 근거 분석 수치를 바탕으로 Qwen AI의 보고서 작성.