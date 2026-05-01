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

// 통계 타입
export interface DashboardStats {
  totalTransactions: number
  totalAmount: number
  normalCount: number
  cautionCount: number
  warningCount: number
  suspiciousByReason: Record<SuspiciousReason, number>
}
