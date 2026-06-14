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
        <p className="text-sm text-gray-500 mt-2">작성일: {new Date().toLocaleDateString("ko-KR")}</p>
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
              <td className="py-1">114~144 라인</td>
            </tr>
          </tbody>
        </table>

        <div className="bg-gray-50 p-4 rounded border text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`export interface BackendTransaction {
  id: number
  step: number
  type: string                       // "TRANSFER" | "CASH_OUT"
  amount: number
  sender: string                     // 송신자 계좌 ID
  receiver: string                   // 수신자 계좌 ID
  oldbalanceOrg: number
  newbalanceOrig: number
  oldbalanceDest: number
  newbalanceDest: number
  transactionDate: string            // "yyyy-MM-dd HH:mm:ss"
  riskLevel: "정상" | "주의" | "위험"
  aiReport: string | null            // AI 보고서 텍스트. 정상거래는 null
  is_blacklist?: 0 | 1 | 2 | 3      // 0:없음 1:송신자 2:수신자 3:둘다
  isBlacklist?: 0 | 1 | 2 | 3
  manualRiskLevel?: "normal" | "caution" | "warning"
  operatorAssigned?: boolean
  manualSuspiciousReason?: SuspiciousReason
}`}
        </div>

        <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 text-sm">
          <strong>핵심 이유:</strong> 백엔드와 프론트엔드 간 데이터 통신의 <strong>계약(Contract)</strong>을 정의합니다. 백엔드 API 응답 형식과 정확히 일치해야 하며, 모든 데이터 변환의 기준점이 됩니다.
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
              <td className="font-semibold py-1">함수명</td>
              <td className="py-1"><code>transformBackendTransactions()</code></td>
            </tr>
          </tbody>
        </table>

        <div className="bg-gray-50 p-4 rounded border text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`export function transformBackendTransactions(
  rows: BackendTransaction[],
  limit = 100_000
): Transaction[] {
  return rows.slice(0, limit).map((row) => {
    // 위험도 변환: 수동 위험도 우선, 없으면 한글 → 영문 매핑
    const riskLevel: RiskLevel = row.manualRiskLevel
      ? row.manualRiskLevel
      : row.riskLevel === "정상" ? "normal"
        : row.riskLevel === "주의" ? "caution"
        : "warning"

    // aiReport에서 신뢰도(%) 자동 추출
    const aiConfidence = row.aiReport
      ? extractConfidenceFromReport(row.aiReport)
      : 95

    // 수동 사유 우선, 없으면 aiReport 내용으로 자동 추론
    const suspiciousReason: SuspiciousReason = row.manualSuspiciousReason
      ? row.manualSuspiciousReason
      : row.aiReport ? inferReasonFromReport(row.aiReport) : "none"

    // is_blacklist: isBlacklist(카멜) 또는 is_blacklist(스네이크) 둘 다 허용
    const isBlacklist = row.isBlacklist ?? row.is_blacklist ?? 0

    return {
      id: String(row.id),
      senderName: row.sender,
      senderAccount: row.sender,
      recipientName: row.receiver,
      recipientAccount: row.receiver,
      amount: row.amount,
      date: new Date(row.transactionDate),
      category: row.type === "TRANSFER" ? "송금" : "현금인출",
      riskLevel,
      suspiciousReason,
      aiConfidence,
      operatorAssigned: row.operatorAssigned ?? false,
      is_blacklist: isBlacklist,
      aiReport: row.aiReport
    }
  })
}`}
        </div>

        <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 text-sm">
          <strong>핵심 이유:</strong> 백엔드 데이터를 프론트 형식으로 <strong>변환하는 핵심 로직</strong>입니다. riskLevel 한글→영문 매핑, aiReport에서 신뢰도 추출, 의심 사유 자동 추론, 수동 보정값 우선 적용 등 <strong>데이터 정규화</strong>를 담당합니다.
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
              <td className="font-semibold py-1">함수명</td>
              <td className="py-1"><code>extractBlacklistFromTransactions()</code></td>
            </tr>
          </tbody>
        </table>

        <div className="bg-gray-50 p-4 rounded border text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`export function extractBlacklistFromTransactions(transactions: Transaction[]) {
  const blacklistEntries = []

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
          <strong>핵심 이유:</strong> is_blacklist 값(0/1/2/3)에 따라 <strong>송신자/수신자를 구분하여 블랙리스트를 자동 추출</strong>합니다. 금융사기 탐지 시스템의 핵심 기능인 블랙리스트 자동화를 담당합니다.
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
              <td className="font-semibold py-1">함수명</td>
              <td className="py-1"><code>loadTransactions()</code></td>
            </tr>
          </tbody>
        </table>

        <div className="bg-gray-50 p-4 rounded border text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`const USE_BACKEND_API = true  // false: 더미데이터 / true: 실제 백엔드

const loadTransactions = async () => {
  setIsLoading(true)

  if (!USE_BACKEND_API) {
    // 더미데이터 모드 (테스트용)
    newTransactions = generateTransactions(100, 0.15)
    setConnectionStatus("mock")
    return
  }

  // 백엔드 API 호출 (재시도 + 타임아웃 포함)
  setConnectionStatus("connecting")
  const result = await fetchTransactions()

  if (result.success && result.data) {
    // 성공: BackendTransaction[] → Transaction[] 변환
    newTransactions = transformBackendTransactions(result.data)
    setTransactions(newTransactions)

    // is_blacklist 값에 따라 블랙리스트 자동 동기화
    syncBlacklist(newTransactions)
    setConnectionStatus("connected")
  } else {
    // 실패: 에러 분류 후 상태 표시
    const msg = getErrorMessage(result.error)
    setConnectionStatus("error")
    setConnectionError(msg)
  }
}`}
        </div>

        <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 text-sm">
          <strong>핵심 이유:</strong> <strong>백엔드 연동의 진입점</strong>으로, API 호출 → 데이터 변환 → 상태 업데이트 → 블랙리스트 자동 추출까지 전체 데이터 흐름을 관장합니다.
        </div>
      </section>

      {/* 5. 위험도 변경 및 알림 처리 */}
      <section className="mb-10 break-inside-avoid">
        <h2 className="text-xl font-bold mb-2 bg-gray-100 p-2">5. 위험도 변경 및 DB 저장</h2>
        <table className="w-full text-sm mb-4 border-collapse">
          <tbody>
            <tr className="border-b">
              <td className="font-semibold py-1 w-24">파일</td>
              <td className="py-1"><code>components/dashboard/dashboard-client.tsx</code></td>
            </tr>
            <tr className="border-b">
              <td className="font-semibold py-1">함수명</td>
              <td className="py-1"><code>handleUpdateRisk()</code></td>
            </tr>
          </tbody>
        </table>

        <div className="bg-gray-50 p-4 rounded border text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`const handleUpdateRisk = async (transactionId: string, newRisk: RiskLevel) => {
  // 1. 화면 즉시 반영 (낙관적 업데이트)
  setTransactions((prev) =>
    prev.map((tx) => tx.id === transactionId
      ? { ...tx, riskLevel: newRisk, operatorAssigned: true }
      : tx
    )
  )
  showRiskAlert(newRisk)  // 하단 중앙 알림 표시

  // 2. 백엔드 DB에 저장 (PATCH 요청)
  const result = await patchTransaction(transactionId, {
    riskLevel: newRisk === "normal" ? "정상" : newRisk === "caution" ? "주의" : "위험",
    manualRiskLevel: newRisk,
    operatorAssigned: true,
  })

  if (!result.success) {
    // 저장 실패 시 toast 알림 후 데이터 재로드
    toast({ title: "저장 실패", variant: "destructive" })
    await loadTransactions()
  } else {
    toast({ title: "저장 완료", description: "변경 내용이 DB에 저장되었습니다." })
  }
}`}
        </div>

        <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 text-sm">
          <strong>핵심 이유:</strong> 운영자가 <strong>AI 판단을 수동으로 보정</strong>하고 결과를 DB에 저장하는 기능입니다. 낙관적 업데이트(화면 즉시 반영)로 UX를 보장하며, 저장 실패 시 자동으로 데이터를 복구합니다.
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
              <td className="border p-2">블랙리스트 자동 추출</td>
              <td className="border p-2 text-red-600 font-semibold">높음</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="border p-2">4</td>
              <td className="border p-2"><code>dashboard-client.tsx</code></td>
              <td className="border p-2">API 호출 / 데이터 로드</td>
              <td className="border p-2 text-red-600 font-semibold">높음</td>
            </tr>
            <tr>
              <td className="border p-2">5</td>
              <td className="border p-2"><code>dashboard-client.tsx</code></td>
              <td className="border p-2">위험도 수동 보정 + DB 저장</td>
              <td className="border p-2 text-yellow-600 font-semibold">중간</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="border p-2">6</td>
              <td className="border p-2"><code>api/transactions/[id]/blacklist</code></td>
              <td className="border p-2">블랙리스트 PATCH 프록시</td>
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
