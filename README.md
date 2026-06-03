# 금융 이상탐지 프로젝트 (Backend)

## 📌 프로젝트 개요

본 프로젝트는 금융 거래 데이터를 기반으로 이상 행위를 탐지하는 시스템을 구현하는 것을 목표로 한다.
현재 단계에서는 데이터 수집 및 처리 기반이 되는 백엔드 서버 구축을 완료하였다.

---

## 🛠️ 개발 환경 및 기술 스택

* **IDE**: IntelliJ IDEA
* **Backend**: Spring Boot
* **Database**: MySQL
* **API 테스트**: Postman

---

## ⚙️ 서버 구조

Spring Boot를 기반으로 아래와 같은 계층 구조를 구성하였다.

* `config` : 환경 설정 및 공통 설정 관리
* `controller` : 클라이언트 요청 처리 (API 엔드포인트)
* `service` : 비즈니스 로직 처리
* `repository` : 데이터베이스 접근 (JPA)
* `entity` : DB 테이블과 매핑되는 객체
* `dto` : 데이터 전달 객체

---

## 💾 데이터베이스 연동

* MySQL과의 연결을 완료하였으며,
* Spring Data JPA를 활용하여 데이터 저장 및 조회 기능을 구현하였다.

---

## 📊 기능 구현 현황

* DB에 저장된 데이터를 화면에 출력할 수 있도록 구현 완료
* API를 통해 데이터 송수신 기능 구현 완료

---

## 🔗 API 테스트

* Postman을 활용하여 API 테스트 진행
* `GET` 요청을 통해 데이터 조회 성공
* `POST` 요청을 통해 데이터 저장 성공

---

## ✅ 현재까지 진행 결과

* Spring Boot 기반 서버 구축 완료
* 계층형 구조 설계 완료
* MySQL 연동 및 데이터 처리 가능
* API 통신 정상 동작 확인
* 해당 사항들을 GCP VM 환경에서 실행 및 검증 완료

---

## ☁️ GCP VM 서버 실행 및 종료 방법

본 프로젝트는 GCP VM 환경에서 Spring Boot 백엔드 서버, FastAPI 기반 AI 서버, MySQL DB를 함께 실행한다.

---

### 1. GCP VM 접속

GCP 콘솔에서 `Compute Engine > VM 인스턴스`로 이동한 뒤, 사용 중인 VM의 `SSH` 버튼을 클릭하여 접속한다.

---

### 2. MySQL DB 실행 확인

MySQL은 VM 부팅 시 자동 실행되도록 설정되어 있다. 실행 상태는 아래 명령어로 확인한다.

```bash
sudo systemctl status mysql
```

정상 실행 상태라면 `active (running)`이 표시된다.

MySQL에 직접 접속하려면 아래 명령어를 사용한다.

```bash
sudo mysql
```

DB 선택:

```sql
USE fds;
```

최근 거래 데이터 확인:

```sql
SELECT id, amount, is_blacklist, risk_level, ai_report
FROM transactions
ORDER BY id DESC
LIMIT 10;
```

MySQL 콘솔 종료:

```sql
EXIT;
```

---

### 3. AI 서버 실행

AI 서버는 FastAPI 기반으로 동작하며, 5000번 포트를 사용한다.

```bash
cd ~/capstone-design-project/xgboost_dev
source venv/bin/activate
python main.py
```

정상 실행 시 아래와 같은 로그가 출력된다.

```text
Uvicorn running on http://0.0.0.0:5000
```

AI 서버 종료:

```text
Ctrl + C
```

가상환경 종료:

```bash
deactivate
```

---

### 4. Spring Boot 백엔드 서버 실행

백엔드 서버는 8080번 포트를 사용한다.

```bash
cd ~/capstone-design-project/FDS_AML
./gradlew bootRun
```

정상 실행 시 아래와 같은 로그가 출력된다.

```text
Tomcat started on port 8080
Started FdsAmlApplication
```

백엔드 서버 종료:

```text
Ctrl + C
```

---

### 5. 서버 동작 확인

백엔드 서버가 정상 실행 중인지 확인한다.

```bash
curl http://localhost:8080/test
```

정상 응답 예시:

```text
서버 정상 실행
```

AI 서버가 정상 실행 중인지 확인한다.

```bash
curl http://localhost:5000/health
```

정상 응답 예시:

```json
{"status":"ok"}
```

---

### 6. 전체 종료 순서

서버 종료 시 아래 순서로 종료한다.

1. AI 서버 실행 창에서 `Ctrl + C`
2. 백엔드 서버 실행 창에서 `Ctrl + C`
3. MySQL 콘솔 사용 중이면 `EXIT;`
4. GCP 콘솔에서 VM 인스턴스 `중지`

주의: VM을 삭제하면 서버 내부 파일, venv, MySQL 설정 등이 사라질 수 있으므로 사용하지 않을 때는 `삭제`가 아니라 `중지`를 선택한다.


---
