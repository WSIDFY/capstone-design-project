import type { Transaction, TransactionHistory, SuspiciousReason, RiskLevel, CsvTransaction, BackendTransaction } from "./transaction-types"
import { FRAUD_ACCOUNTS } from "./transaction-types"

// 이름 데이터
const INDIVIDUAL_NAMES = [
  "김민준", "이서연", "박지호", "최예린", "정현우",
  "강수빈", "조민서", "윤하은", "장도윤", "임서영",
  "한지민", "신유진", "권태현", "송지우", "오예준",
  "서민아", "황지훈", "안수현", "전소연", "류승민"
]

const INSTITUTION_NAMES = [
  "삼성전자", "현대자동차", "SK텔레콤", "LG전자", "카카오",
  "네이버", "쿠팡", "배달의민족", "토스", "신한은행",
  "국민은행", "하나은행", "우리은행", "농협", "GS리테일"
]

const CATEGORIES = [
  "온라인쇼핑", "식비", "교통", "통신", "의료",
  "교육", "여가", "보험", "공과금", "송금", "급여", "투자"
]

const LOCATIONS = [
  "서울 강남구", "서울 서초구", "서울 종로구", "서울 마포구",
  "경기 성남시", "경기 수원시", "부산 해운대구", "대구 중구",
  "인천 연수구", "광주 서구", "대전 유성구", "울산 남구"
]

// 유틸리티 함수
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateAccountNumber(): string {
  return `${randomInt(100, 999)}-${randomInt(100, 999)}-${randomInt(100000, 999999)}`
}

function generateId(): string {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 거래 내역 생성기
export function generateTransactions(count: number, suspiciousRatio: number = 0.15): Transaction[] {
  const transactions: Transaction[] = []
  const accountHistories: Map<string, TransactionHistory> = new Map()
  
  const suspiciousCount = Math.floor(count * suspiciousRatio)
  const normalCount = count - suspiciousCount
  
  // 정상 거래 생성
  for (let i = 0; i < normalCount; i++) {
    const tx = generateNormalTransaction(accountHistories)
    transactions.push(tx)
  }
  
  // 의심 거래 생성
  for (let i = 0; i < suspiciousCount; i++) {
    const tx = generateSuspiciousTransaction(accountHistories)
    transactions.push(tx)
  }
  
  // 날짜순 정렬 (최신순)
  transactions.sort((a, b) => b.date.getTime() - a.date.getTime())
  
  return transactions
}

function generateNormalTransaction(histories: Map<string, TransactionHistory>): Transaction {
  const isInstitution = Math.random() > 0.7
  const senderAccount = generateAccountNumber()
  
  // 기존 거래 내역 확인 또는 새로 생성
  let history = histories.get(senderAccount)
  if (!history) {
    history = {
      accountId: senderAccount,
      previousTransactions: [],
      averageAmount: randomInt(10000, 500000),
      usualLocations: [randomChoice(LOCATIONS), randomChoice(LOCATIONS)]
    }
    histories.set(senderAccount, history)
  }
  
  const amount = Math.round(history.averageAmount * (0.5 + Math.random()))
  const location = randomChoice(history.usualLocations)
  
  return {
    id: generateId(),
    senderName: isInstitution ? randomChoice(INSTITUTION_NAMES) : randomChoice(INDIVIDUAL_NAMES),
    senderType: isInstitution ? "institution" : "individual",
    senderAccount,
    recipientName: randomChoice(INDIVIDUAL_NAMES),
    recipientAccount: generateAccountNumber(),
    amount,
    date: new Date(Date.now() - randomInt(0, 7 * 24 * 60 * 60 * 1000)),
    category: randomChoice(CATEGORIES),
    location,
    riskLevel: "normal",
    suspiciousReason: "none",
    aiConfidence: randomInt(85, 99),
    operatorAssigned: false,
    is_blacklist: 0
  }
}

function generateSuspiciousTransaction(histories: Map<string, TransactionHistory>): Transaction {
  const suspiciousType = randomInt(1, 4)
  let reason: SuspiciousReason
  let riskLevel: RiskLevel
  let amount: number
  let recipientAccount: string
  let location: string | undefined
  let aiConfidence: number
  
  const senderAccount = generateAccountNumber()
  
  switch (suspiciousType) {
    case 1: // 첫 거래 고액 이체 (보이스피싱 의심)
      reason = "first_large_transfer"
      riskLevel = Math.random() > 0.5 ? "warning" : "caution"
      amount = randomInt(5000000, 50000000) // 500만원 ~ 5000만원
      recipientAccount = generateAccountNumber()
      location = randomChoice(LOCATIONS)
      aiConfidence = randomInt(70, 95)
      break
      
    case 2: // 비정상 위치 연속 결제 (카드 도난 의심)
      reason = "unusual_location"
      riskLevel = "caution"
      amount = randomInt(100000, 2000000)
      recipientAccount = generateAccountNumber()
      // 평소와 다른 위치
      location = Math.random() > 0.5 ? "해외 베트남 호치민" : "해외 중국 상하이"
      aiConfidence = randomInt(65, 90)
      break
      
    case 3: // 신고된 사기계좌로 송금
      reason = "fraud_account"
      riskLevel = "warning"
      amount = randomInt(1000000, 30000000)
      recipientAccount = randomChoice(FRAUD_ACCOUNTS)
      location = randomChoice(LOCATIONS)
      aiConfidence = randomInt(90, 99)
      break
      
    case 4: // 자금세탁 의심
    default:
      reason = "money_laundering"
      riskLevel = "warning"
      amount = randomInt(10000000, 100000000) // 1000만원 ~ 1억원
      recipientAccount = generateAccountNumber()
      location = randomChoice(LOCATIONS)
      aiConfidence = randomInt(60, 85)
      break
  }
  
  return {
    id: generateId(),
    senderName: randomChoice(INDIVIDUAL_NAMES),
    senderType: "individual",
    senderAccount,
    recipientName: randomChoice(INDIVIDUAL_NAMES),
    recipientAccount,
    amount,
    date: new Date(Date.now() - randomInt(0, 3 * 24 * 60 * 60 * 1000)), // 최근 3일 내
    category: reason === "fraud_account" ? "송금" : randomChoice(CATEGORIES),
    location,
    riskLevel,
    suspiciousReason: reason,
    aiConfidence,
    operatorAssigned: false,
    // 사기계좌(fraud_account)이면 is_blacklist=1, 나머지 의심거래는 0
    is_blacklist: reason === "fraud_account" ? 1 : 0
  }
}

// 대시보드 통계 계산
export function calculateStats(transactions: Transaction[]) {
  const stats = {
    totalTransactions: transactions.length,
    totalAmount: transactions.reduce((sum, tx) => sum + tx.amount, 0),
    normalCount: transactions.filter(tx => tx.riskLevel === "normal").length,
    cautionCount: transactions.filter(tx => tx.riskLevel === "caution").length,
    warningCount: transactions.filter(tx => tx.riskLevel === "warning").length,
    suspiciousByReason: {
      first_large_transfer: 0,
      unusual_location: 0,
      fraud_account: 0,
      money_laundering: 0,
      rapid_transactions: 0,
      none: 0
    } as Record<SuspiciousReason, number>
  }
  
  transactions.forEach(tx => {
    stats.suspiciousByReason[tx.suspiciousReason]++
  })
  
  return stats
}

// 의심 사유 한글 변환
export function getReasonText(reason: SuspiciousReason): string {
  const reasonMap: Record<SuspiciousReason, string> = {
    first_large_transfer: "첫 거래 고액 이체 (보이스피싱 의심)",
    unusual_location: "비정상 위치 결제 (카드 도난 의심)",
    fraud_account: "신고된 사기계좌 송금",
    money_laundering: "자금세탁 의심",
    rapid_transactions: "단시간 다수 거래",
    none: "정상"
  }
  return reasonMap[reason]
}

// 위험도 한글 변환
export function getRiskText(level: RiskLevel): string {
  const riskMap: Record<RiskLevel, string> = {
    normal: "정상",
    caution: "주의",
    warning: "경고"
  }
  return riskMap[level]
}

// 금액 포맷팅
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW"
  }).format(amount)
}

/**
 * split_3.csv 에서 읽어온 CsvTransaction[] 배열을 최대 100,000건 제한 후
 * 프론트에서 사용하는 Transaction[] 형태로 변환합니다.
 *
 * - is_blacklist === 1 이면 riskLevel을 "warning", suspiciousReason을 "fraud_account"로 강제 설정
 * - is_blacklist === 0 이면 CSV의 suspicious_reason 값으로 riskLevel을 도출
 *
 * 백엔드 API 연동 예시:
 *   const raw: CsvTransaction[] = await fetch("/api/transactions").then(r => r.json())
 *   const transactions = parseCSVTransactions(raw)
 */
export function parseCSVTransactions(
  rows: CsvTransaction[],
  limit = 100_000
): Transaction[] {
  return rows.slice(0, limit).map((row) => {
    const isBlacklisted = row.is_blacklist === 1

    const suspiciousReason: SuspiciousReason = isBlacklisted
      ? "fraud_account"
      : (row.suspicious_reason ?? "none")

    const riskLevel: RiskLevel = deriveRiskLevel(suspiciousReason, isBlacklisted)

    return {
      id: row.id,
      senderName: row.sender_name,
      senderType: row.sender_type,
      senderAccount: row.sender_account,
      recipientName: row.recipient_name,
      recipientAccount: row.recipient_account,
      amount: Number(row.amount),
      date: new Date(row.date),
      category: row.category,
      location: row.location,
      riskLevel,
      suspiciousReason,
      aiConfidence: Number(row.ai_confidence),
      operatorAssigned: false,
      is_blacklist: row.is_blacklist,
    }
  })
}

/** suspicious_reason 과 is_blacklist 값으로 위험도를 도출 */
function deriveRiskLevel(reason: SuspiciousReason, isBlacklisted: boolean): RiskLevel {
  if (isBlacklisted || reason === "fraud_account" || reason === "money_laundering") {
    return "warning"
  }
  if (reason === "first_large_transfer" || reason === "unusual_location" || reason === "rapid_transactions") {
    return "caution"
  }
  return "normal"
}

/**
 * is_blacklist === 1 인 거래만 추려 BlacklistEntry 배열로 변환합니다.
 * dashboard-client.tsx 의 초기 블랙리스트 상태 세팅에 사용합니다.
 */
export function extractBlacklistFromTransactions(
  transactions: Transaction[]
) {
  return transactions
    .filter((tx) => tx.is_blacklist === 1)
    .map((tx) => ({
      id: `bl-csv-${tx.id}`,
      name: tx.recipientName,
      accountNumber: tx.recipientAccount,
      reason: tx.suspiciousReason,
      addedAt: tx.date,
      relatedTransactionId: tx.id,
    }))
}

// 날짜 포맷팅
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)
}

/**
 * 백엔드 API에서 받은 BackendTransaction[] 배열을 프론트에서 사용하는 Transaction[] 형태로 변환합니다.
 *
 * 변환 규칙:
 * - riskLevel: "정상" → "normal", "위험" → "warning" (caution은 백엔드에서 안 옴)
 * - sender/receiver → senderName, senderAccount / recipientName, recipientAccount (동일값)
 * - aiReport: null이면 정상, 있으면 의심거래
 * - aiConfidence: aiReport에서 % 숫자 추출
 * - suspiciousReason: aiReport 내용으로 판단
 *
 * 백엔드 API 호출 예시:
 *   const response = await fetch("http://localhost:8080/transactions")
 *   const backendData: BackendTransaction[] = await response.json()
 *   const transactions = transformBackendTransactions(backendData)
 */
export function transformBackendTransactions(
  rows: BackendTransaction[],
  limit = 100_000
): Transaction[] {
  return rows.slice(0, limit).map((row) => {
    // riskLevel 변환: "정상" → "normal", "위험" → "warning"
    const riskLevel: RiskLevel = row.riskLevel === "정상" ? "normal" : "warning"

    // aiConfidence 추출: aiReport에서 숫자(%) 추출
    const aiConfidence = row.aiReport
      ? extractConfidenceFromReport(row.aiReport)
      : 95

    // suspiciousReason 추출: aiReport 내용으로 판단
    const suspiciousReason: SuspiciousReason = row.aiReport
      ? inferReasonFromReport(row.aiReport)
      : "none"

    // is_blacklist은 백엔드에서 제공하지 않으므로 0으로 설정 (추후 별도 엔드포인트에서 처리)
    return {
      id: String(row.id),
      senderName: row.sender, // 동일값 사용
      senderType: "individual", // 백엔드에서 구분 제공 안 함
      senderAccount: row.sender,
      recipientName: row.receiver, // 동일값 사용
      recipientAccount: row.receiver,
      amount: row.amount,
      date: new Date(row.transactionDate), // "yyyy-MM-dd HH:mm:ss" 파싱
      category: row.type === "TRANSFER" ? "송금" : "현금인출",
      location: undefined, // 백엔드에서 제공 안 함
      riskLevel,
      suspiciousReason,
      aiConfidence,
      operatorAssigned: false,
      is_blacklist: 0,
      aiReport: row.aiReport // 백엔드 AI 보고서 텍스트 추가
    }
  })
}

/**
 * aiReport 텍스트에서 신뢰도 % 추출
 * 예: "92%의 신뢰도로" → 92
 */
function extractConfidenceFromReport(report: string): number {
  const match = report.match(/(\d{1,3})%/)
  return match ? parseInt(match[1], 10) : 50
}

/**
 * aiReport 텍스트 내용으로 의심 사유 추론
 */
function inferReasonFromReport(report: string): SuspiciousReason {
  if (report.includes("사기") || report.includes("금융사기")) {
    return "fraud_account"
  }
  if (report.includes("자금세탁") || report.includes("세탁")) {
    return "money_laundering"
  }
  if (report.includes("보이스피싱") || report.includes("고액 이체")) {
    return "first_large_transfer"
  }
  if (report.includes("카드 도난") || report.includes("비정상 위치")) {
    return "unusual_location"
  }
  if (report.includes("연속")) {
    return "rapid_transactions"
  }
  return "none"
}
