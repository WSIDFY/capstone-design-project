"use client"

export default function ReportPage() {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-white text-black p-8 print:p-4">
      {/* 인쇄 버튼 - 인쇄 시 숨김 */}
      <div className="print:hidden mb-6 flex justify-end">
        <button
          onClick={handlePrint}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          PDF로 저장 (Ctrl+P)
        </button>
      </div>

      {/* 보고서 헤더 */}
      <header className="text-center mb-10 border-b-2 border-black pb-6">
        <h1 className="text-3xl font-bold mb-2">FDS Monitor 프론트엔드 핵심 코드</h1>
        <p className="text-gray-600">이상거래탐지시스템 주간 보고서</p>
        <p className="text-sm text-gray-500 mt-2">작성일: {new Date().toLocaleDateString('ko-KR')}</p>
      </header>

      {/* 목차 */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2">목차</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>백엔드 API 응답 타입 정의</li>
          <li>백엔드 응답 → 프론트 데이터 변환 함수</li>
          <li>블랙리스트 추출 로직</li>
          <li>API 호출 및 데이터 로드</li>
          <li>위험도 변경 및 알림 처리</li>
        </ol>
      </section>

      {/* 1. 백엔드 API 응답 타입 정의 */}
      <section className="mb-10 break-inside-avoid">
        <h2 className="text-xl font-bold mb-2 bg-gray-100 p-2">1. 백엔드 API 응답 타입 정의</h2>
        <table className="w-full text-sm mb-4 border-collapse">
          <tbody>
            <tr className="border-b">
              <td className="font-semibold py-1 w-24">파일</td>
              <td className="py-1"><code>lib/transaction-types.ts</code></td>
            </tr>
            <tr className="border-b">
              <td className="font-semibold py-1">위치</td>
              <td className="py-1">114~139 라인</td>
            </tr>
          </tbody>
        </table>
        
        <div className="bg-gray-50 p-4 rounded border text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`/**
 * 백엔드 API 응답 형식 (split_3.csv 기반)
 * ============================================
 * [DB 조회] http://localhost:8080/transactions 에서 이 형태로 데이터 수신
 * ============================================
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
  /**
   * 블랙리스트 여부
   * 0: 블랙리스트 없음
   * 1: 송신자만 블랙리스트
   * 2: 수신자만 블랙리스트
   * 3: 송신자 + 수신자 둘 다 블랙리스트
   */
  is_blacklist?: 0 | 1 | 2 | 3
}`}
        </div>
        
        <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 text-sm">
          <strong>핵심 이유:</strong> 백엔드와 프론트엔드 간 데이터 통신의 <strong>계약(Contract)</strong>을 정의하는 인터페이스입니다. 백엔드 API 응답 형식과 정확히 일치해야 하며, 모든 데이터 변환의 기준점이 됩니다.
        </div>
      </section>

      {/* 2. 백엔드 응답 → 프론트 데이터 변환 함수 */}
      <section className="mb-10 break-inside-avoid">
        <h2 className="text-xl font-bold mb-2 bg-gray-100 p-2">2. 백엔드 응답 → 프론트 데이터 변환 함수</h2>
        <table className="w-full text-sm mb-4 border-collapse">
          <tbody>
            <tr className="border-b">
              <td className="font-semibold py-1 w-24">파일</td>
              <td className="py-1"><code>lib/transaction-generator.ts</code></td>
            </tr>
            <tr className="border-b">
              <td className="font-semibold py-1">위치</td>
              <td className="py-1">267~327 라인</td>
            </tr>
          </tbody>
        </table>
        
        <div className="bg-gray-50 p-4 rounded border text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`export function transformBackendTransactions(
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
      senderName: row.sender,
      senderType: "individual",
      senderAccount: row.sender,
      recipientName: row.receiver,
      recipientAccount: row.receiver,
      amount: row.amount,
      date: new Date(row.transactionDate),
      category: row.type === "TRANSFER" ? "송금" : "현금인출",
      location: undefined,
      riskLevel,
      suspiciousReason,
      aiConfidence,
      operatorAssigned: false,
      is_blacklist: isBlacklist,
      aiReport: row.aiReport
    }
  })
}`}
        </div>
        
        <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 text-sm">
          <strong>핵심 이유:</strong> 백엔드 데이터를 프론트엔드 형식으로 <strong>변환하는 핵심 로직</strong>입니다. riskLevel 한글→영문 매핑, aiReport에서 신뢰도 추출, 의심 사유 자동 추론 등 <strong>데이터 정규화</strong>를 담당합니다.
        </div>
      </section>

      {/* 3. 블랙리스트 추출 로직 */}
      <section className="mb-10 break-inside-avoid">
        <h2 className="text-xl font-bold mb-2 bg-gray-100 p-2">3. 블랙리스트 추출 로직</h2>
        <table className="w-full text-sm mb-4 border-collapse">
          <tbody>
            <tr className="border-b">
              <td className="font-semibold py-1 w-24">파일</td>
              <td className="py-1"><code>lib/transaction-generator.ts</code></td>
            </tr>
            <tr className="border-b">
              <td className="font-semibold py-1">위치</td>
              <td className="py-1">202~253 라인</td>
            </tr>
          </tbody>
        </table>
        
        <div className="bg-gray-50 p-4 rounded border text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`export function extractBlacklistFromTransactions(
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
        id: \`bl-sender-\${tx.id}\`,
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
        id: \`bl-receiver-\${tx.id}\`,
        name: tx.recipientName,
        accountNumber: tx.recipientAccount,
        reason: tx.suspiciousReason,
        addedAt: tx.date,
        relatedTransactionId: tx.id,
      })
    }
  })

  return blacklistEntries
}`}
        </div>
        
        <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 text-sm">
          <strong>핵심 이유:</strong> is_blacklist 값(0/1/2/3)에 따라 <strong>송신자/수신자를 구분하여 블랙리스트를 추출</strong>하는 비즈니스 로직입니다. 금융사기 탐지 시스템의 핵심 기능인 블랙리스트 관리를 담당합니다.
        </div>
      </section>

      {/* 4. API 호출 및 데이터 로드 */}
      <section className="mb-10 break-inside-avoid">
        <h2 className="text-xl font-bold mb-2 bg-gray-100 p-2">4. API 호출 및 데이터 로드</h2>
        <table className="w-full text-sm mb-4 border-collapse">
          <tbody>
            <tr className="border-b">
              <td className="font-semibold py-1 w-24">파일</td>
              <td className="py-1"><code>components/dashboard/dashboard-client.tsx</code></td>
            </tr>
            <tr className="border-b">
              <td className="font-semibold py-1">위치</td>
              <td className="py-1">46~105 라인</td>
            </tr>
          </tbody>
        </table>
        
        <div className="bg-gray-50 p-4 rounded border text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`const loadTransactions = async () => {
  setIsLoading(true)
  try {
    // [DB 조회 설정] useBackendApi = true 시 실제 백엔드 API 호출
    const useBackendApi = true // 백엔드 준비 완료 시 true로 변경

    let newTransactions: Transaction[]

    if (useBackendApi) {
      try {
        // [DB 조회] 백엔드 API 호출
        // 엔드포인트: http://localhost:8080/transactions
        const response = await fetch("http://localhost:8080/transactions")
        if (!response.ok) throw new Error(\`API 오류: \${response.status}\`)
        
        const backendData: BackendTransaction[] = await response.json()
        newTransactions = transformBackendTransactions(backendData)
      } catch (error) {
        console.error("[FDS] 백엔드 API 호출 실패:", error)
        newTransactions = []
      }
    } else {
      // [더미데이터] 백엔드 연동 전 테스트용
      newTransactions = generateTransactions(100, 0.15)
    }

    setTransactions(newTransactions)

    // [DB 조회 후 처리] is_blacklist 값에 따라 블랙리스트 자동 추가
    const csvBlacklist = extractBlacklistFromTransactions(newTransactions)

    setBlacklist(prev => {
      const existingAccounts = new Set(prev.map(e => e.accountNumber))
      const uniqueNew = csvBlacklist.filter(e => !existingAccounts.has(e.accountNumber))
      return [...prev, ...uniqueNew]
    })
  } catch (error) {
    console.error("[FDS] 거래 내역 로드 실패:", error)
  } finally {
    setIsLoading(false)
  }
}`}
        </div>
        
        <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 text-sm">
          <strong>핵심 이유:</strong> <strong>백엔드 연동의 진입점</strong>으로, API 호출 → 데이터 변환 → 상태 업데이트 → 블랙리스트 추출까지 전체 데이터 흐름을 관장합니다. <code>useBackendApi</code> 플래그로 테스트/운영 모드 전환이 가능합니다.
        </div>
      </section>

      {/* 5. 위험도 변경 및 알림 처리 */}
      <section className="mb-10 break-inside-avoid">
        <h2 className="text-xl font-bold mb-2 bg-gray-100 p-2">5. 위험도 변경 및 알림 처리</h2>
        <table className="w-full text-sm mb-4 border-collapse">
          <tbody>
            <tr className="border-b">
              <td className="font-semibold py-1 w-24">파일</td>
              <td className="py-1"><code>components/dashboard/dashboard-client.tsx</code></td>
            </tr>
            <tr className="border-b">
              <td className="font-semibold py-1">위치</td>
              <td className="py-1">115~140 라인</td>
            </tr>
          </tbody>
        </table>
        
        <div className="bg-gray-50 p-4 rounded border text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`const handleUpdateRisk = (transactionId: string, newRisk: RiskLevel) => {
  setTransactions(prev =>
    prev.map(tx => {
      if (tx.id === transactionId) {
        return {
          ...tx,
          riskLevel: newRisk,
          operatorAssigned: true,
          suspiciousReason: newRisk === "normal" ? "none" : tx.suspiciousReason
        }
      }
      return tx
    })
  )
  // 선택된 거래의 riskLevel도 업데이트
  setSelectedTransaction(prev =>
    prev && prev.id === transactionId ? { ...prev, riskLevel: newRisk } : prev
  )
  showRiskAlert(newRisk)
}`}
        </div>
        
        <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 text-sm">
          <strong>핵심 이유:</strong> 운영자가 <strong>AI 판단을 수동으로 보정</strong>할 수 있는 핵심 기능입니다. 위험도 변경 시 거래 목록과 상세 패널이 동기화되며, 시각적 알림으로 UX를 제공합니다.
        </div>
      </section>

      {/* 요약 테이블 */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4 bg-gray-100 p-2">요약</h2>
        <table className="w-full text-sm border-collapse border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2 text-left">번호</th>
              <th className="border p-2 text-left">파일</th>
              <th className="border p-2 text-left">기능</th>
              <th className="border p-2 text-left">중요도</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-2">1</td>
              <td className="border p-2"><code>transaction-types.ts</code></td>
              <td className="border p-2">백엔드 API 계약 정의</td>
              <td className="border p-2 text-red-600 font-semibold">높음</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="border p-2">2</td>
              <td className="border p-2"><code>transaction-generator.ts</code></td>
              <td className="border p-2">데이터 변환 로직</td>
              <td className="border p-2 text-red-600 font-semibold">높음</td>
            </tr>
            <tr>
              <td className="border p-2">3</td>
              <td className="border p-2"><code>transaction-generator.ts</code></td>
              <td className="border p-2">블랙리스트 추출</td>
              <td className="border p-2 text-red-600 font-semibold">높음</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="border p-2">4</td>
              <td className="border p-2"><code>dashboard-client.tsx</code></td>
              <td className="border p-2">API 호출/데이터 로드</td>
              <td className="border p-2 text-red-600 font-semibold">높음</td>
            </tr>
            <tr>
              <td className="border p-2">5</td>
              <td className="border p-2"><code>dashboard-client.tsx</code></td>
              <td className="border p-2">위험도 수동 보정</td>
              <td className="border p-2 text-yellow-600 font-semibold">중간</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 푸터 */}
      <footer className="text-center text-sm text-gray-500 border-t pt-4 mt-10">
        <p>FDS Monitor - 이상거래탐지시스템 프론트엔드 핵심 코드 보고서</p>
      </footer>
    </div>
  )
}
