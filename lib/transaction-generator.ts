import type {
  Transaction,
  TransactionHistory,
  SuspiciousReason,
  RiskLevel,
  CsvTransaction,
  BackendTransaction,
} from "./transaction-types"
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
  console.warn("[FDS] generateTransactions: 더미데이터 생성기 호출됨 - 백엔드 연동 후 제거 필요")
  return []
}
// ============================================

// ============================================
// [더미데이터] generateNormalTransaction - 백엔드 연동 후 삭제 예정
// ============================================
function generateNormalTransaction(histories: Map<string, TransactionHistory>): Transaction {
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
    is_blacklist: 0,
  }
}
// ============================================

// ============================================
// [더미데이터] generateSuspiciousTransaction - 백엔드 연동 후 삭제 예정
// ============================================
function generateSuspiciousTransaction(histories: Map<string, TransactionHistory>): Transaction {
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
    is_blacklist: 0,
  }
}
// ============================================

// 대시보드 통계 계산
export function calculateStats(transactions: Transaction[]) {
  const stats = {
    totalTransactions: transactions.length,
    totalAmount: transactions.reduce((sum, tx) => sum + tx.amount, 0),
    normalCount: transactions.filter((tx) => tx.riskLevel === "normal").length,
    cautionCount: transactions.filter((tx) => tx.riskLevel === "caution").length,
    warningCount: transactions.filter((tx) => tx.riskLevel === "warning").length,
    suspiciousByReason: {
      first_large_transfer: 0,
      unusual_location: 0,
      fraud_account: 0,
      money_laundering: 0,
      rapid_transactions: 0,
      none: 0,
    } as Record<SuspiciousReason, number>,
  }

  transactions.forEach((tx) => {
    stats.suspiciousByReason[tx.suspiciousReason]++
  })

  return stats
}

export function getReasonText(reason: SuspiciousReason): string {
  const reasonMap: Record<SuspiciousReason, string> = {
  first_large_transfer: "보이스 피싱 의심",
    unusual_location: "비정상 위치 결제 (카드 도난 의심)",
    fraud_account: "신고된 사기계좌 송금",
    money_laundering: "자금세탁 의심 거래",
    rapid_transactions: "단시간 다수 거래",
    none: "정상",
  }

  return reasonMap[reason]
}

// 위험도 한글 변환
export function getRiskText(level: RiskLevel): string {
  const riskMap: Record<RiskLevel, string> = {
    normal: "정상",
    caution: "주의",
    warning: "경고",
  }

  return riskMap[level]
}

// 금액 포맷팅
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  }).format(amount)
}

/**
 * split_3.csv 에서 읽어온 CsvTransaction[] 배열을 최대 100,000건 제한 후
 * 프론트에서 사용하는 Transaction[] 형태로 변환합니다.
 */
export function parseCSVTransactions(rows: CsvTransaction[], limit = 100_000): Transaction[] {
  return rows.slice(0, limit).map((row) => {
    const blacklistValue = normalizeBlacklistValue(row.isBlacklist ?? row.is_blacklist ?? 0)
    const isBlacklisted = blacklistValue > 0

    const suspiciousReason: SuspiciousReason = isBlacklisted
      ? "fraud_account"
      : row.suspicious_reason ?? "none"

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
      operatorAssigned: isBlacklisted,
      is_blacklist: blacklistValue,
    }
  })
}

/**
 * suspiciousReason 과 is_blacklist 값으로 위험도를 도출
 *
 * normal  : 정상
 * caution : 자금세탁, 보이스피싱, 위치 이상, 단시간 다수 거래
 * warning : 블랙리스트, 사기계좌
 */
/**
 * suspiciousReason 과 is_blacklist 값으로 위험도를 도출
 *
 * normal  : 정상
 * caution : 자금세탁, 보이스피싱, 위치 이상, 단시간 다수 거래, 사기계좌(블랙리스트 제외)
 * warning : 블랙리스트만 해당
 */
function deriveRiskLevel(reason: SuspiciousReason, isBlacklisted: boolean): RiskLevel {
  if (isBlacklisted) {
    return "warning"
  }

  if (
    reason === "money_laundering" ||
    reason === "first_large_transfer" ||
    reason === "unusual_location" ||
    reason === "rapid_transactions" ||
    reason === "fraud_account"
  ) {
    return "caution"
  }

  return "normal"
}
// ...existing code...

/**
 * ============================================
 * [DB 조회 후 블랙리스트 추출]
 * ============================================
 */
export function extractBlacklistFromTransactions(transactions: Transaction[]) {
  const blacklistEntries: {
    id: string
    name: string
    accountNumber: string
    reason: SuspiciousReason
    addedAt: Date
    relatedTransactionId: string
  }[] = []

  transactions.forEach((tx) => {
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
    minute: "2-digit",
  }).format(date)
}

/**
 * is_blacklist 값을 0 | 1 | 2 | 3 타입으로 정규화합니다.
 */
function normalizeBlacklistValue(value: unknown): 0 | 1 | 2 | 3 {
  const num = Number(value)

  if (num === 1) return 1
  if (num === 2) return 2
  if (num === 3) return 3

  return 0
}

/**
 * 자금세탁 세트 탐지
 *
 * 조건:
 * 1. 같은 step
 * 2. 같은 amount
 * 3. 앞 거래의 receiver가 뒤 거래의 sender와 같음
 *
 * 예:
 * A -> B, 100만원
 * B -> C, 100만원
 *
 * 위 두 거래는 하나의 자금세탁 세트로 보고 둘 다 money_laundering 처리합니다.
 */
function findMoneyLaunderingSetIds(rows: BackendTransaction[]): Set<number> {
  const launderingIds = new Set<number>()

  for (const first of rows) {
    for (const second of rows) {
      if (first.id === second.id) continue

      const sameStep = Number(first.step) === Number(second.step)
      const sameAmount = Number(first.amount) === Number(second.amount)
      const connected = String(first.receiver) === String(second.sender)

      // 기존: 같은 step, 같은 금액, 앞 거래의 수신자가 뒤 거래의 송신자와 같으면 자금세탁 세트
      if (sameStep && sameAmount && connected) {
        launderingIds.add(first.id)
        launderingIds.add(second.id)
        continue
      }

      // 새로운 룰: 수취인이 송금받은 금액을 같은 step 내에 전부 인출(CASH_OUT)한 경우
      // - first가 TRANSFER이고 second가 CASH_OUT이며
      // - sameStep 이고 first.receiver === second.sender (연결) 이며
      // - second.amount 가 transfer 거래의 newbalanceDest(수취인 계좌의 인출 가능한 전체 잔액)와 같으면
      //   해당 두 거래를 자금세탁 세트로 간주
      try {
        const firstType = String((first as any).type || "").toUpperCase()
        const secondType = String((second as any).type || "").toUpperCase()

        if (
          sameStep &&
          connected &&
          firstType === "TRANSFER" &&
          secondType === "CASH_OUT"
        ) {
          const transferNewDest = Number((first as any).newbalanceDest)
          const cashOutAmount = Number((second as any).amount)

          // 수취인이 받은 후 해당 계좌의 전체 잔액을 인출한 경우
          if (!Number.isNaN(transferNewDest) && transferNewDest === cashOutAmount) {
            launderingIds.add(first.id)
            launderingIds.add(second.id)
          }
        }
      } catch (e) {
        // 방어 코드: 필드가 없거나 변환 실패 시 무시
      }
    }
  }

  return launderingIds
}

/**
 * ============================================
 * [DB 조회] 백엔드 API 응답 → 프론트 Transaction 변환
 * ============================================
 *
 * 백엔드 API에서 받은 BackendTransaction[] 배열을 프론트에서 사용하는 Transaction[] 형태로 변환합니다.
 *
 * 변환 규칙:
 * - 블랙리스트(is_blacklist > 0): fraud_account / warning
 * - 자금세탁 세트: money_laundering / caution
 * - 백엔드 riskLevel "주의": caution
 * - 백엔드 riskLevel "위험": warning
 * - 나머지: normal
 */
export function transformBackendTransactions(
  rows: BackendTransaction[],
  limit = 100_000
): Transaction[] {
  const limitedRows = rows.slice(0, limit)
  const moneyLaunderingSetIds = findMoneyLaunderingSetIds(limitedRows)

  return limitedRows.map((row) => {
    const isMoneyLaunderingSet = moneyLaunderingSetIds.has(row.id)

    const blacklistValue = normalizeBlacklistValue(row.isBlacklist ?? row.is_blacklist ?? 0)
    const isBlacklistedRow = blacklistValue > 0

    const reportReason: SuspiciousReason = row.aiReport
      ? inferReasonFromReport(row.aiReport)
      : "none"

    const suspiciousReason: SuspiciousReason = row.manualSuspiciousReason
      ? row.manualSuspiciousReason
      : isBlacklistedRow
        ? "fraud_account"
        : isMoneyLaunderingSet
          ? "money_laundering"
          : reportReason

    // 위험도 결정 우선순위:
    // 1) 수동 설정(manualRiskLevel)
    // 2) 블랙리스트 -> warning
    // 3) 자금세탁 세트 -> caution
    // 4) AI가 보이스피싱(first_large_transfer)으로 탐지한 경우 -> 강제 caution (요청사항)
    // 5) 백엔드 위험레벨 매핑
    // 6) 그 외 suspiciousReason 기반 유도 or normal
    const riskLevel: RiskLevel = row.manualRiskLevel
      ? row.manualRiskLevel
      : isBlacklistedRow
        ? "warning"
        : isMoneyLaunderingSet
          ? "caution"
          : (suspiciousReason === "first_large_transfer")
            ? "caution"
            : row.riskLevel === "주의"
              ? "caution"
              : row.riskLevel === "위험"
                ? "warning"
                : suspiciousReason !== "none"
                  ? deriveRiskLevel(suspiciousReason, isBlacklistedRow)
                  : "normal"

    const aiConfidence = row.aiReport
      ? extractConfidenceFromReport(row.aiReport)
      : isMoneyLaunderingSet || isBlacklistedRow
        ? 90
        : 95

    return {
      id: String(row.id),
      senderName: row.sender,
      senderType: "individual",
      senderAccount: row.sender,
      recipientName: row.receiver,
      recipientAccount: row.receiver,
      amount: Number(row.amount),
      date: new Date(row.transactionDate),
      category: row.type === "TRANSFER" ? "송금" : "현금인출",
      location: undefined,
      riskLevel,
      suspiciousReason,
      aiConfidence,
      operatorAssigned: row.operatorAssigned ?? false,
      is_blacklist: blacklistValue,
      aiReport: row.aiReport,
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
  if (!report) {
    return "none"
  }

  if (
    report.includes("자금세탁 의심") ||
    report.includes("자금세탁 의심거래") ||
    report.includes("자금세탁이 의심") ||
    report.includes("자금세탁")
  ) {
    return "money_laundering"
  }

  if (
    report.includes("사기계좌") ||
    report.includes("신고 사기계좌") ||
    report.includes("신고된 사기계좌") ||
    report.includes("블랙리스트 매칭")
  ) {
    return "fraud_account"
  }

  if (
    report.includes("보이스피싱") ||
    report.includes("최초 고액") ||
    report.includes("고액 송금") ||
    report.includes("고액 이체")
  ) {
    return "first_large_transfer"
  }

  if (
    report.includes("카드 도난") ||
    report.includes("비정상 위치") ||
    report.includes("위치 이상")
  ) {
    return "unusual_location"
  }

  if (
    report.includes("연속 거래") ||
    report.includes("반복 거래") ||
    report.includes("짧은 시간")
  ) {
    return "rapid_transactions"
  }

  return "none"
}