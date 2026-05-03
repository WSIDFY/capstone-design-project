# 이상금융거래(FDS) 및 자금세탁(AML) 탐지 서비스 개발

### 프로젝트 개요
- 머신러닝&AI&GCP(Google Cloude Platform)를 활용한 교내 캡스톤 디자인 프로젝트를 기획합니다.

---
### 프로젝트 목표
- 가상의 거래내역 데이터를 기반으로 실시간 의심거래 패턴을 탐지하고 관제할 수 있는 대시보드형 시스템을 구축합니다.
---
## 팀원 소개

|       Front-end      |       Back-end        |       Infra      |       AI      |                          
| :--------------------------: |  :-----------------------------------: | :------------------------------------:| :------------------------------------:|
| <img src="https://github.com/donghwanJ.png" width="100px" alt="정동환"/> | <img src="https://github.com/yeeunnnnn.png" width="100px" alt="강예은"/> | <img src="https://github.com/qkrtkdals962.png" width="100px" alt="박상민"/> |  <img src="https://github.com/WSIDFY.png" width="100px" alt="김민재"/>  |
|[정동환](https://github.com/donghwanJ)|[강예은](https://github.com/yeeunnnnn)|[박상민](https://github.com/qkrtkdals962)|[김민재](https://github.com/WSIDFY)|

---
#### 주요 라이브러리
- **xgboost**: 실시간 사기 탐지 핵심 엔진.
- **pandas/numpy**: PaySim 데이터셋 핸들링.
- **shap**: "왜 이 거래가 사기인가?"에 대한 근거 추출 (Qwen 리포트 생성용).
- **fastapi/uvicorn**: 실시간 탐지 API 서버 구축.
- **python-dotenv**: API 키 등 보안 설정 관리.
- **dashscope**: Qwen 2.5/3 모델 API 연동 라이브러리 (Alibaba Cloud).

**(설치 방법)**
```python
python -m venv venv
.\venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install pandas numpy scikit-learn xgboost shap
# 가상환경 없이 전역 설치라면 아래의 명령어 실행
python -m pip install pandas numpy scikit-learn xgboost shap
```

---
#### 주요 기능
- [거래내역 생성기 개발]
    - 'Paysim'데이터 셋을 기반으로 거래 내역을 1건씩 발생시키는(전달하는) 제네레이터를 개발합니다

- [이상거래 탐지 모델 개발]
    - XGBoost를 활용하여 데이터 셋을 통한 학습과 모델의 생성 및 저장, 저장된 모델 기반의 이상거래 탐지모델을 구현합니다.

- [이상거래 보고서 생성]
    - AI가 전달한 근거데이터를 바탕으로 Qwen AI가 왜 이상거래로 식별되었는지에 대한 보고서를 작성하여 제시합니다.



***(참고)***  
- 본 프로젝트는 "Paysim"데이터 셋을 활용한 프로젝트입니다.
(참고 : https://www.kaggle.com/datasets/ealaxi/paysim1)
- 사용된 AI모델 : **Qwen** (근거 데이터 기반 보고서 생성용으로 활용)
- 사용된 머신러닝 라이브러리 : **XGBoost** (거래 내역을 분석하고 검증 로직에 따른 의심거래 탐지로 활용)
- 본 프로젝트의 이상거래 시나리오의 종류는 아래와 같습니다.
1. *블랙리스트 사용자가 포함된 거래 발생*
    - 임의로 지정된 블랙리스트 사용자(ex.'C22182953')가 포함되어있는 거래가 발생했을 때(송신자, 수신자 둘 중 하나 혹은 둘 다)
2. *자금세탁 의심 거래 발생*
    - 한 계좌로 '계좌이체(TRANSFER)'된 금액이 '아주 짧은 주기(step)' 내에 '인출(CASH_OUT)'되는 연쇄 행위가 발생했을 때
3. *보이스피싱 의심 거래 발생*
    - 평소 거래가 이뤄지지 않은 사용자 간의 거액 송금, 계좌이체 후 잔액이 0원이 되는 경우가 발생했을 때
4. *카드 도난 의심거래 발생*
    - 해당 시나리오는 지역별로 기준을 만들어야 하기에 보류(데이터 셋 내에 지역관련 식별 정보 포함 X)