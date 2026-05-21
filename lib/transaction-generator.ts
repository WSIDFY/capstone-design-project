import type { Transaction, TransactionHistory, SuspiciousReason, RiskLevel, CsvTransaction, BackendTransaction } from "./transaction-types"
import { FRAUD_ACCOUNTS } from "./transaction-types"

// ============================================
// [더미데이터] 백엔드 연동 전 테스트용 - 연동 후 삭제 예정
// ============================================
const INDIVIDUAL_NAMES: string[] = []
const INSTITUTION_NAMES: string[] = []
const CATEGORIES: string[] = []
const LOCATIONS: string[] = []
// ============================================

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

// ============================================
// [더미데이터 생성기] 백엔드 연동 전 테스트용 - 연동 후 삭제 예정
// ============================================
export function generateTransactions(count: number, suspiciousRatio: number = 0.15): Transaction[] {
  // 백엔드 연동 후에는 빈 배열 반환 (실제 데이터는 API에서 가져옴)
  console.warn("[FDS] generateTransactions: 더미데이터 생성기 호출됨 - 백엔드 연동 후 제거 필요")
  return []
}
// ============================================

// ============================================
// [더미데이터] generateNormalTransaction - 백엔드 연동 후 삭제 예정
// ============================================
function generateNormalTransaction(histories: Map<string, TransactionHistory>): Transaction {
  // 빈 거래 객체 반환 (더미데이터 제거됨)
  return {
    id: "",
    senderName: "",
    senderType: "individual",
    senderAccount: "",
    recipientName: "",
    recipientAccount: "",
    amount: 0,
    date: new Date(),
    category: "",
    location: "",
    riskLevel: "normal",
    suspiciousReason: "none",
    aiConfidence: 0,
    operatorAssigned: false,
    is_blacklist: 0
  }
}
// ============================================

// ============================================
// [더미데이터] generateSuspiciousTransaction - 백엔드 연동 후 삭제 예정
// ============================================
function generateSuspiciousTransaction(histories: Map<string, TransactionHistory>): Transaction {
  // 빈 거래 객체 반환 (더미데이터 제거됨)
  return {
    id: "",
    senderName: "",
    senderType: "individual",
    senderAccount: "",
    recipientName: "",
    recipientAccount: "",
    amount: 0,
    date: new Date(),
    category: "",
    location: "",
    riskLevel: "warning",
    suspiciousReason: "fraud_account",
    aiConfidence: 0,
    operatorAssigned: false,
    is_blacklist: 0
  }
}
// ============================================

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
 * ============================================
 * [DB 조회 후 블랙리스트 추출]
 * ============================================
 * is_blacklist 값에 따라 블랙리스트 대상을 구분하여 추출합니다.
 * 
 * is_blacklist 값:
 * - 0: 블랙리스트 없음 (추출 안 함)
 * - 1: 송신자만 블랙리스트 → senderName, senderAccount 추출
 * - 2: 수신자만 블랙리스트 → recipientName, recipientAccount 추출
 * - 3: 둘 다 블랙리스트 → 송신자, 수신자 모두 추출 (2개 항목)
 */
export function extractBlacklistFromTransactions(
  transactions: Transaction[]
) {
  const blacklistEntries: {
    id: string
    name: string
    accountNumber: string
    reason: SuspiciousReason
    addedAt: Date
    relatedTransactionId: string
  }[] = []

  transactions.forEach((tx) => {
    // is_blacklist === 1 또는 3: 송신자 블랙리스트
    if (tx.is_blacklist === 1 || tx.is_blacklist === 3) {
      blacklistEntries.push({
        id: `bl-sender-${tx.id}`,
        name: tx.senderName,
        accountNumber: tx.senderAccount,
        reason: tx.suspiciousReason,
        addedAt: tx.date,
        relatedTransactionId: tx.id,
      })
    }

    // is_blacklist === 2 또는 3: 수신자 블랙리스트
    if (tx.is_blacklist === 2 || tx.is_blacklist === 3) {
      blacklistEntries.push({
        id: `bl-receiver-${tx.id}`,
        name: tx.recipientName,
        accountNumber: tx.recipientAccount,
        reason: tx.suspiciousReason,
        addedAt: tx.date,
        relatedTransactionId: tx.id,
      })
    }
  })

  return blacklistEntries
}
// ============================================

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
 * ============================================
 * [DB 조회] 백엔드 API 응답 → 프론트 Transaction 변환
 * ============================================
 * 백엔드 API에서 받은 BackendTransaction[] 배열을 프론트에서 사용하는 Transaction[] 형태로 변환합니다.
 *
 * 변환 규칙:
 * - riskLevel: "정상" → "normal", "위험" → "warning" (caution은 백엔드에서 안 옴)
 * - sender/receiver → senderName, senderAccount / recipientName, recipientAccount (동일값)
 * - aiReport: null이면 정상, 있으면 의심거래
 * - aiConfidence: aiReport에서 % 숫자 추출
 * - suspiciousReason: aiReport 내용으로 판단
 * - is_blacklist: 백엔드에서 제공 (0=없음, 1=송신자만, 2=수신자만, 3=둘다)
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

    // is_blacklist: 백엔드에서 제공하면 사용, 없으면 0 (기본값)
    const isBlacklist = row.is_blacklist ?? 0

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
      is_blacklist: isBlacklist,
      aiReport: row.aiReport // 백엔드 AI 보고서 텍스트 추가
    }
  })
}
// ============================================

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
