import type { Transaction, TransactionHistory, SuspiciousReason, RiskLevel } from "./transaction-types"
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
    operatorAssigned: false
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
    operatorAssigned: false
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
