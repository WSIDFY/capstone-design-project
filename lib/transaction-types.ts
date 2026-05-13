// 거래 내역 타입 정의
export type RiskLevel = "normal" | "caution" | "warning"

export type SuspiciousReason =
  | "first_large_transfer" // 첫 거래 고액 이체 (보이스피싱 의심)
  | "unusual_location" // 비정상 위치 연속 결제 (카드 도난 의심)
  | "fraud_account" // 신고된 사기계좌로 송금
  | "money_laundering" // 자금세탁 의심
  | "rapid_transactions" // 단시간 다수 거래
  | "none"

export interface Transaction {
  id: string
  senderName: string
  senderType: "individual" | "institution"
  senderAccount: string
  recipientName: string
  recipientAccount: string
  amount: number
  date: Date
  category: string
  location?: string
  // AI 분석 결과
  riskLevel: RiskLevel
  suspiciousReason: SuspiciousReason
  aiConfidence: number // AI 신뢰도 (0-100)
  // 운영자 할당 여부
  operatorAssigned: boolean
  operatorNote?: string
  // CSV 원본 블랙리스트 여부 (0: 정상, 1: 블랙리스트)
  is_blacklist: 0 | 1
  // 백엔드 AI 보고서 (aiReport가 있으면 의심거래)
  aiReport?: string | null
}

/**
 * split_3.csv 의 각 행에 대응하는 원시 타입.
 * 백엔드에서 이 형태로 데이터를 넘겨주면 parseCSVTransactions()로 변환합니다.
 */
export interface CsvTransaction {
  /** 거래 고유 ID */
  id: string
  /** 송금인 이름 */
  sender_name: string
  /** 송금인 유형 (individual | institution) */
  sender_type: "individual" | "institution"
  /** 송금인 계좌번호 */
  sender_account: string
  /** 수취인 이름 */
  recipient_name: string
  /** 수취인 계좌번호 */
  recipient_account: string
  /** 거래 금액 (원) */
  amount: number
  /** 거래 일시 (ISO 8601 문자열) */
  date: string
  /** 거래 카테고리 */
  category: string
  /** 거래 위치 (선택) */
  location?: string
  /** AI 의심 사유 코드 */
  suspicious_reason: SuspiciousReason
  /** AI 신뢰도 0-100 */
  ai_confidence: number
  /** 블랙리스트 여부 (0: 정상, 1: 블랙리스트) */
  is_blacklist: 0 | 1
}

export interface TransactionHistory {
  accountId: string
  previousTransactions: {
    recipientAccount: string
    totalAmount: number
    count: number
  }[]
  averageAmount: number
  usualLocations: string[]
}

// 신고된 사기 계좌 목록 (시뮬레이션용)
export const FRAUD_ACCOUNTS = [
  "110-456-789012",
  "352-789-456123",
  "789-123-456789",
  "456-321-987654",
  "999-888-777666",
]

// 블랙리스트 타입
export interface BlacklistEntry {
  id: string
  name: string
  accountNumber: string
  reason: SuspiciousReason
  addedAt: Date
  relatedTransactionId: string
  note?: string
}

/**
 * 백엔드 API 응답 형식 (split_3.csv 기반)
 * http://localhost:8080/transactions 에서 이 형태로 데이터 수신
 */
export interface BackendTransaction {
  id: number
  step: number
  type: string // "TRANSFER" | "CASH_OUT"
  amount: number
  sender: string // 송신자 계좌 ID
  receiver: string // 수신자 계좌 ID
  oldbalanceOrg: number
  newbalanceOrig: number
  oldbalanceDest: number
  newbalanceDest: number
  transactionDate: string // "yyyy-MM-dd HH:mm:ss"
  riskLevel: "정상" | "위험"
  aiReport: string | null // AI 보고서 텍스트. 정상거래는 null
}

// 통계 타입
export interface DashboardStats {
  totalTransactions: number
  totalAmount: number
  normalCount: number
  cautionCount: number
  warningCount: number
  suspiciousByReason: Record<SuspiciousReason, number>
}
