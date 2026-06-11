# 이상금융거래(FDS) 및 자금세탁(AML) 탐지 서비스 개발
===
### 팀원 소개

|       Front-end      |       Back-end        |       Infra      |       AI      |                          
| :--------------------------: |  :-----------------------------------: | :------------------------------------:| :------------------------------------:|
| <img src="https://github.com/donghwanJ.png" width="100px" alt="정동환"/> | <img src="https://github.com/yeeunnnnn.png" width="100px" alt="강예은"/> | <img src="https://github.com/qkrtkdals962.png" width="100px" alt="박상민"/> |  <img src="https://github.com/WSIDFY.png" width="100px" alt="김민재"/>  |
|[정동환](https://github.com/donghwanJ)|[강예은](https://github.com/yeeunnnnn)|[박상민](https://github.com/qkrtkdals962)|[김민재](https://github.com/WSIDFY)|

---
### 프로젝트 개요
- 머신러닝&AI&GCP(Google Cloude Platform)를 활용한 교내 캡스톤 디자인 프로젝트를 기획합니다.

---
### 프로젝트 목표
- 가상의 거래내역 데이터(Paysim)를 기반으로 실시간 의심거래 패턴을 탐지하고 관제할 수 있는 대시보드형 FDS서비스를 구축합니다.

---
### 주요 라이브러리
- **xgboost**: 실시간 사기 탐지 핵심 엔진.
- **pandas/numpy**: PaySim 데이터셋 핸들링.
- **shap**: 의심거래에 대한 근거 추출 (Qwen 리포트 생성용).
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
    - 'Paysim'데이터 셋을 기반으로 3초당 거래 내역을 1건씩 발생시키는 제네레이터를 개발합니다

- [이상거래 탐지 모델 개발]
    - XGBoost를 활용하여 데이터 셋을 통한 학습과 모델의 생성 및 저장, 저장된 모델 기반의 이상거래 탐지모델을 구현합니다.

- [이상거래 보고서 생성]
    - AI가 전달한 근거데이터를 바탕으로 Qwen AI가 왜 이상거래로 식별되었는지에 대한 보고서를 작성하여 제시합니다.

---
#### 트러블 슈팅
<details>
<summary>SHAP 값 계산 성능 개선</summary>
| Solution. 샘플링 방식을 통해 응답시간 개선
<br><br>


***(기존 내용)***
```python
[20-40ms] SHAP 값 계산 (필수)
    └─ XGBoost 모델에서 15개 피처의 Shapley 값 도출
    
[10-28ms] additivity 검증 (선택적 - 현재 활성화) ← 병목위험
					├─ Step 1: 모든 SHAP 값 합산
					├─ Step 2: base_value 추출 (전체 학습 데이터 통계)
					├─ Step 3: 다시 모델 예측 실행
					├─ Step 4: 오차 계산 (예측값 vs SHAP 합)
					├─ Step 5: 임계값 비교
					└─ Step 6: (오차가 크다면) 경고 및 로깅 작업
```

***(수정 내용)***
```python
[20-40ms] SHAP 값 계산 (필수)
    └─ XGBoost 모델에서 15개 피처의 Shapley 값 도출 (동일)
    
[0ms] additivity 검증 생략
    └─ 검증 단계 스킵 
```

***(개선 효과)***
- 'additivity 검증 과정을 생략'하는 과정으로 처리 속도 향상률을 기대할 수 있음
</details>

<details>
<summary>transfer_history 메모리 누적문제 해결</summary>
| Solution. 최대 데이터 개수 및 FIFO기법 적용을 통한 데이터 상한선 정의(코드 품질 개선)
<br><br>


***(기존 내용)***
| 서버 운영 기간 | 누적 거래 수 | 메모리 사용량 | 상태 |
| --- | --- | --- | --- |
| **1주일** | ~350,000 | 약 175MB | ✓ 정상 |
| **1개월** | ~1,500,000 | 약 750MB | ⚠️ 주의 |
| **3개월** | ~4,500,000 | 약 2.25GB | ⚠️⚠️ 위험 |
| **6개월** | ~9,000,000 | 약 4.5GB | ⚠️⚠️⚠️ 심각 |
| **1년** | ~18,000,000 | 약 9GB | ❌ 위험 |s
(주기: 일일 50,000건 TRANSFER 거래 기준)


***(수정 내용)***
```python
# 기본: OrderedDict로 최대 10,000개 제한
# 추가: 오래된 거래(7일 이상)는 주기적으로 정리
from collections import OrderedDict

# FIFO 방식으로 최대 10,000개 거래 기록 유지
        self.MAX_HISTORY_SIZE = 10000
        self.RETENTION_STEPS = 7 * 24  # 7일 (시간 단위)
        self.transfer_history = OrderedDict()

    # FIFO 및 TTL 방식으로 거래내역 저장 관리
    def _update_transfer_history(self, dest_acc, step, amount):
        """
        FIFO + TTL 방식으로 transfer_history 관리
        - 최대 크기 초과 시 가장 오래된 항목 제거 (FIFO방식)
        - 오래된 거래(7일 이상) 주기적으로 정리 (TTL)
        """
        # 오래된 거래 정리 (TTL 기반)
        expired_accounts = [
            acc for acc, (s, _) in self.transfer_history.items()
            if step - s > self.RETENTION_STEPS
        ]
        for acc in expired_accounts:
            del self.transfer_history[acc]
        
        # 새 항목 추가
        self.transfer_history[dest_acc] = (step, amount)
        
        # 최대 크기 초과 시 가장 오래된 항목 제거 (FIFO)
        if len(self.transfer_history) > self.MAX_HISTORY_SIZE:
            self.transfer_history.popitem(last=False)
```

***(개선 효과)***
- 기간(7일)과 데이터 용량(10,000개) 초과 시 가장 오래된 항목을 제거하도록 상한선 정의
</details>

<details>
<summary>중복 근거 생성 코드 제거</summary>
| Solution. 헬퍼 메서드 추가 및 로직 중복 정의 통합
<br><br>


***(기존 내용)***
| 문제 | 영향 |
| --- | --- |
| **코드 중복** | 같은 로직이 2곳에 정의 |
| **설명 문구 중복** | 근거 설명(desc) 동일 |
| **유지보수 어려움** | 규칙 수정 시 2곳 모두 변경 필요 |
| **버그 가능성** | 한 곳만 수정 시 불일치 발생 |
| **필드명 불일치** | 첫 번째: `"column"`, 두 번째: `"feature"` |


***(수정 내용)***
```python
# 헬퍼 메서드 추출
def _create_rule_evidence(self, is_phishing_pattern, is_chain_laundering, 
                          is_orig_black, is_dest_black, 
                          orig_acc, dest_acc, amount, laundering_evidence):
    """
    규칙 기반 근거 생성 (보이스피싱, 자금세탁, 블랙리스트)
    
    Args:
        is_phishing_pattern: 보이스피싱 의심 패턴 여부
        is_chain_laundering: 연쇄 자금세탁 패턴 여부
        is_orig_black: 송신자 블랙리스트 여부
        is_dest_black: 수신자 블랙리스트 여부
        orig_acc, dest_acc, amount: 거래 정보
        laundering_evidence: 자금세탁 근거 객체
        
    Returns:
        list: 규칙 기반 근거 리스트
    """
    evidence = []
    
    # 블랙리스트 송신자
    if is_orig_black:
        evidence.append({
            "feature": "sender",
            "score": 10.0,
            "value": orig_acc,
            "desc": "블랙리스트 송신자 식별 : 내부 데이터베이스에 등록된 고위험 블랙리스트 대상자와의 연루 거래 식별. 제재 대상자와의 금지된 금융 접촉으로 분류됨."
        })
    
    # 블랙리스트 수신자
    if is_dest_black:
        evidence.append({
            "feature": "receiver",
            "score": 10.0,
            "value": dest_acc,
            "desc": "블랙리스트 수신자 식별 : 내부 데이터베이스에 등록된 고위험 블랙리스트 대상자와의 연루 거래 식별. 제재 대상자와의 금지된 금융 접촉으로 분류됨."
        })
    
    # 보이스피싱 패턴
    if is_phishing_pattern:
        evidence.append({
            "feature": "phishing_pattern",
            "score": 10.0,
            "value": amount,
            "desc": "보이스피싱 의심 : 계좌 내 전액 외부 송금 발생 및 잔액 급감(0원). 단시간 내 자산 전액 유출은 전형적인 보이스피싱 피해 사례의 긴급 자금 인출 패턴으로 판단됨."
        })
    
    # 연쇄 자금세탁 패턴
    if is_chain_laundering and laundering_evidence is not None:
        evidence.append(laundering_evidence)
    
    return evidence
```

***(개선 효과)***
| 항목 | 효과 |
| --- | --- |
| **코드 중복 제거** | ~40줄 감소 |
| **유지보수성** | 규칙 변경 시 1곳만 수정 |
| **테스트 용이성** | 메서드 단위 테스트 가능 |
| **버그 위험** | 불일치 가능성 제거 |
| **확장성** | 새 규칙 추가 시 메서드만 수정 |
</details>

<details>
<summary>BLACKLIST_ACCOUNTS 리스트 제거</summary>
| Solution. 중복
<br><br>


***(기존 내용)***
- 이미 불러온 거래 데이터에 is_blacklist 필드가 포함되어 있으면 그 값을 사용하여 검증,<br>
그렇지 않은 경우에는 preprocess.py의 하드코딩된 BLACKLIST_ACCOUNTS로 대체 조회

***(수정 내용)***
- 받아오는 거래내역 데이터에 ‘is_blacklist’값을 참조하여 블랙리스트 의심거래 시나리오를 식별하기 때문에<br>
해당 리스트는 초기 테스트용으로만 사용 되었으며 현재는 불필요한 2중 검증이므로<br>
해당 리스트와 해당 리스트를 사용하여 검증하는 로직의 제거 진행

***(개선 효과)***
- 검증 소요시간 개선
</details>

---
***(참고)***  
- 본 프로젝트는 "Paysim"데이터 셋을 활용한 프로젝트입니다.
(참고 : https://www.kaggle.com/datasets/ealaxi/paysim1)
- 사용된 AI모델 : **Qwen** (근거 데이터 기반 보고서 생성용으로 활용)
- 사용된 머신러닝 라이브러리 : **XGBoost** (거래 내역을 분석하고 검증 로직에 따른 의심거래 탐지로 활용)
- 본 프로젝트의 이상거래 시나리오의 종류는 아래와 같습니다.
1. *블랙리스트 사용자가 포함된 거래 발생*
    - is_blacklist 컬럼의 값에 따라 블랙리스트 사용자가 포함되어있을 때(0:없음/1:송신자/2:수신자/3:송,수신자 모두)
2. *자금세탁 의심 거래 발생*
    - 한 계좌로 '계좌이체(TRANSFER)'된 금액이 '아주 짧은 주기(step)' 내에 '인출(CASH_OUT)'되는 연쇄 행위가 발생했을 때
3. *보이스피싱 의심 거래 발생*
    - 계좌이체 후 잔액이 0원이 되는 경우가 발생했을 때(전액 송금)


