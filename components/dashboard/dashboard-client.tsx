"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/dashboard/header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { RiskCharts } from "@/components/dashboard/risk-charts"
import { TransactionTable } from "@/components/dashboard/transaction-table"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { ReportPanel } from "@/components/dashboard/report-panel"
import { BlacklistPanel } from "@/components/dashboard/blacklist-panel"
import { generateTransactions, calculateStats, extractBlacklistFromTransactions, transformBackendTransactions } from "@/lib/transaction-generator"
import type { Transaction, RiskLevel, BlacklistEntry } from "@/lib/transaction-types"
import { fetchTransactions, getErrorMessage, patchTransaction } from "@/lib/api-client"
import { ConnectionStatusBar, type ConnectionStatus, type ConnectionLog } from "@/components/dashboard/connection-status-bar"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, AlertCircle, CheckCircle } from "lucide-react"

// ============================================
// [DB 조회 설정] 백엔드 연동 ON/OFF 스위치
// true: 실제 백엔드 API 호출 / false: 더미데이터 사용
// 백엔드 준비 완료 시 true로 변경하세요.
// ============================================
const USE_BACKEND_API = true

export default function DashboardClient() {
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filterRisk, setFilterRisk] = useState<RiskLevel | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([])
  const [activeTab, setActiveTab] = useState<"transactions" | "blacklist">("transactions")
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [riskAlert, setRiskAlert] = useState<{ risk: RiskLevel; visible: boolean } | null>(null)
  // ============================================
  // [DB 조회] 백엔드 연결 상태 및 로그
  // ============================================
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle")
  const [connectionError, setConnectionError] = useState<string>("")
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLog[]>([])

  // 로그 추가 헬퍼
  const addLog = useCallback((level: ConnectionLog["level"], message: string) => {
    const time = new Date().toLocaleTimeString("ko-KR", { hour12: false })
    setConnectionLogs((prev) => [...prev.slice(-49), { time, level, message }])
  }, [])

  useEffect(() => {
    // 초기 테마 적용
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add("dark")
  }, [])

  const handleToggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(newTheme)
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  // 실시간 자동갱신: 10초마다 거래 내역 새로고침 (페이지 전체 새로고침 없이 로그만 갱신)
  useEffect(() => {
    if (!USE_BACKEND_API) return
    const POLL_INTERVAL = 10_000
    const intervalId = setInterval(() => {
      // 백그라운드 폴링: 로딩 스피너 없이 조용히 갱신
      fetchTransactions().then((result) => {
        if (result.success && result.data) {
          const updated = transformBackendTransactions(result.data)
            .sort((a, b) => b.date.getTime() - a.date.getTime())
          setTransactions(updated)
          syncBlacklist(updated)
        }
      })
    }, POLL_INTERVAL)
    return () => clearInterval(intervalId)
  }, [])

  // ============================================
  // [DB 조회] 거래 내역 로드 함수
  // ============================================
  const loadTransactions = async () => {
    setIsLoading(true)

    let newTransactions: Transaction[] = []

    // ============================================
    // [더미데이터] USE_BACKEND_API = false 일 때 테스트용 - 연동 후 삭제
    // ============================================
    if (!USE_BACKEND_API) {
      addLog("warn", "더미데이터 모드로 실행 중 (USE_BACKEND_API = false)")
      newTransactions = generateTransactions(100, 0.15)
        .sort((a, b) => b.date.getTime() - a.date.getTime())
      setTransactions(newTransactions)
      syncBlacklist(newTransactions)
      setConnectionStatus("mock")
      setIsLoading(false)
      return
    }
    // ============================================

    // ============================================
    // [DB 조회] 백엔드 API 호출 (재시도 + 타임아웃 + 에러 분류)
    // 엔드포인트: /api/transactions (Next.js 프록시 → localhost:8080)
    // ============================================
    setConnectionStatus("connecting")
    setConnectionError("")
    addLog("info", "백엔드 연결 시도...")

    const result = await fetchTransactions()

    if (result.success && result.data) {
      // 성공: 백엔드 데이터 변환 후 최신순(날짜 내림차순) 정렬
      newTransactions = transformBackendTransactions(result.data)
        .sort((a, b) => b.date.getTime() - a.date.getTime())
      setTransactions(newTransactions)
      syncBlacklist(newTransactions)
      setConnectionStatus("connected")
      addLog("info", `데이터 ${result.data.length}건 수신 및 변환 완료`)
    } else {
      // 실패: 에러 메시지 표시 (데이터는 빈 배열 유지)
      const msg = result.error ? getErrorMessage(result.error) : "알 수 없는 오류"
      setConnectionStatus("error")
      setConnectionError(msg)
      addLog("error", `연결 실패: ${result.error?.type ?? "unknown"} - ${msg}`)
      setTransactions([])
    }
    // ============================================

    setIsLoading(false)
  }

  // ============================================
  // [DB 조회 후 처리] is_blacklist 값에 따라 블랙리스트 자동 추가
  // is_blacklist: 0=없음, 1=송신자만, 2=수신자만, 3=둘다
  // ============================================
  const syncBlacklist = (txs: Transaction[]) => {
    const csvBlacklist = extractBlacklistFromTransactions(txs)
    setBlacklist((prev) => {
      const existingAccounts = new Set(prev.map((e) => e.accountNumber))
      const uniqueNew = csvBlacklist.filter((e) => !existingAccounts.has(e.accountNumber))
      return [...prev, ...uniqueNew]
    })
  }
  // ============================================

  const stats = useMemo(() => calculateStats(transactions), [transactions])

  const filteredTransactions = useMemo(() => {
    let result = transactions

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(tx => 
        tx.senderName.toLowerCase().includes(query) ||
        tx.recipientName.toLowerCase().includes(query) ||
        tx.senderAccount.includes(query) ||
        tx.recipientAccount.includes(query)
      )
    }

    if (filterRisk !== "all") {
      result = result.filter(tx => tx.riskLevel === filterRisk)
    }

    return result
  }, [transactions, searchQuery, filterRisk])

  const showRiskAlert = useCallback((risk: RiskLevel) => {
    setRiskAlert({ risk, visible: true })
    setTimeout(() => setRiskAlert(null), 2500)
  }, [])

  const handleUpdateRisk = async (transactionId: string, newRisk: RiskLevel) => {
    const currentTransaction = transactions.find((tx) => tx.id === transactionId)
    if (!currentTransaction) {
      return
    }

    const updatedReason = newRisk === "normal" ? "none" : currentTransaction.suspiciousReason
    const updatedTransaction = {
      ...currentTransaction,
      riskLevel: newRisk,
      operatorAssigned: true,
      suspiciousReason: updatedReason,
    }

    setTransactions((prev) => prev.map((tx) => (tx.id === transactionId ? updatedTransaction : tx)))
    setSelectedTransaction((prev) =>
      prev && prev.id === transactionId ? updatedTransaction : prev
    )
    showRiskAlert(newRisk)

    if (!USE_BACKEND_API) {
      return
    }

    const result = await patchTransaction(transactionId, {
      riskLevel:
        newRisk === "normal"
          ? "정상"
          : newRisk === "caution"
            ? "주의"
            : "위험",
      manualRiskLevel: newRisk,
      suspiciousReason: updatedReason,
      operatorAssigned: true,
    })

    if (!result.success) {
      toast({
        title: "저장 실패",
        description: "서버에 위험도 변경 내용을 저장하지 못했습니다.",
        variant: "destructive",
      })
      await loadTransactions()
      return
    }

    toast({
      title: "저장 완료",
      description: "변경 내용이 DB에 저장되었습니다.",
    })
  }

  const handleSelectTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
  }

  const handleClosePanel = () => {
    setSelectedTransaction(null)
  }

  const handleAddToBlacklist = async (transaction: Transaction) => {
    const newEntry: BlacklistEntry = {
      id: `bl-manual-${transaction.id}-${Date.now()}`,
      name: transaction.recipientName,
      accountNumber: transaction.recipientAccount,
      reason: transaction.suspiciousReason !== "none" ? transaction.suspiciousReason : "fraud_account",
      addedAt: new Date(),
      relatedTransactionId: transaction.id,
    }

    const targetTransaction = transactions.find((tx: Transaction) => tx.id === transaction.id)
    if (!targetTransaction) {
      toast({
        title: "거래 정보를 찾을 수 없습니다.",
        variant: "destructive",
        duration: 2000,
      })
      return
    }

    const currentBlacklistStatus = targetTransaction.is_blacklist ?? 0
    const isRegistering = currentBlacklistStatus === 0
    const updatedBlacklistStatus: 0 | 1 | 2 | 3 = isRegistering ? 2 : 0

    const updatedTransaction: Transaction = {
      ...targetTransaction,
      is_blacklist: updatedBlacklistStatus,
      operatorAssigned: isRegistering,
      // 블랙리스트 등록: 경고 + 사기계좌, 해제: 정상 + none
      riskLevel: isRegistering ? "warning" : "normal",
      suspiciousReason: isRegistering ? "fraud_account" : "none",
    }

    setTransactions((prev: Transaction[]) =>
      prev.map((tx: Transaction) =>
        tx.id === transaction.id ? updatedTransaction : tx
      )
    )

    setSelectedTransaction((prev: Transaction | null) =>
      prev && prev.id === transaction.id ? updatedTransaction : prev
    )

    if (updatedBlacklistStatus === 0) {
      setBlacklist((prev: BlacklistEntry[]) =>
        prev.filter((entry) => entry.accountNumber !== newEntry.accountNumber)
      )
    } else {
      setBlacklist((prev: BlacklistEntry[]) => [...prev, newEntry])
    }

    if (USE_BACKEND_API) {
      const response = await fetch(`/api/transactions/${transaction.id}/blacklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_blacklist: updatedBlacklistStatus }),
      })

      if (!response.ok) {
        toast({
          title: "저장 실패",
          description: "서버에 블랙리스트 등록 내용을 저장하지 못했습니다.",
          variant: "destructive",
        })
        await loadTransactions()
        return
      }
    }

    toast({
      title: "블랙리스트 등록이 완료되었습니다.",
      description: `계좌: ${newEntry.accountNumber}`,
      duration: 2000,
    })
  }

  const handleRemoveFromBlacklist = async (id: string) => {
    const targetEntry = blacklist.find((entry) => entry.id === id)
    if (!targetEntry) return

    setBlacklist((prev) => prev.filter((entry) => entry.id !== id))

    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === targetEntry.relatedTransactionId
          ? { ...tx, is_blacklist: 0 as const, operatorAssigned: false, riskLevel: "normal", suspiciousReason: "none" }
          : tx
      )
    )

    if (USE_BACKEND_API) {
      const response = await fetch(
        `/api/transactions/${targetEntry.relatedTransactionId}/blacklist`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_blacklist: 0 }),
        }
      )

      if (!response.ok) {
        await loadTransactions()
        return
      }
    }
  }

  const riskAlertConfig = {
    normal:  { label: "정상",  Icon: CheckCircle,  bg: "bg-success",      text: "text-success-foreground",      ring: "ring-success"      },
    caution: { label: "주의",  Icon: AlertCircle,  bg: "bg-warning",      text: "text-warning-foreground",      ring: "ring-warning"      },
    warning: { label: "경고",  Icon: AlertTriangle, bg: "bg-destructive", text: "text-destructive-foreground",  ring: "ring-destructive"  },
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header theme={theme} onToggleTheme={handleToggleTheme} />

      {/* 중앙 하단 위험도 변경 알림 */}
      {riskAlert && (() => {
        const cfg = riskAlertConfig[riskAlert.risk]
        return (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div
              className={`pointer-events-none flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ring-1 opacity-85 ${cfg.bg} ${cfg.text} ${cfg.ring} animate-in fade-in slide-in-from-bottom-2 duration-200`}
            >
              <cfg.Icon className="h-4 w-4 shrink-0" />
              <p className="text-sm font-medium">
                위험도가 <span className="font-bold">{cfg.label}</span>(으)로 변경되었습니다
              </p>
            </div>
          </div>
        )
      })()}
      
      <div className="flex-1 overflow-y-auto">
        {/* 메인 영역 */}
        <main className={`transition-all duration-300 ${
          selectedTransaction && activeTab === "transactions" ? "pr-[480px]" : ""
        }`}>
          <div className="container mx-auto px-4 py-6 space-y-6">
            {/* ============================================
                [DB 조회] 백엔드 연결 상태 표시 바
                ============================================ */}
            <ConnectionStatusBar
              status={connectionStatus}
              dataCount={transactions.length}
              errorMessage={connectionError}
              logs={connectionLogs}
              onRetry={loadTransactions}
            />

            <StatsCards stats={stats} />
            <RiskCharts stats={stats} />
            
            {/* 탭 전환 */}
              <div className="flex gap-2 border-b border-border pb-4">
                <Button
                  variant={activeTab === "transactions" ? "default" : "ghost"}
                  onClick={() => {
                    setActiveTab("transactions")
                  }}
                  className="gap-2"
                >
                  거래 내역
                </Button>
                <Button
                  variant={activeTab === "blacklist" ? "default" : "ghost"}
                  onClick={() => {
                    setActiveTab("blacklist")
                    setSelectedTransaction(null)
                  }}
                  className="gap-2"
                >
                  블랙리스트
                  {blacklist.length > 0 && (
                    <span className="bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
                      {blacklist.length}
                    </span>
                  )}
                </Button>
              </div>

              {activeTab === "transactions" ? (
                <>
                  <FilterBar
                    filterRisk={filterRisk}
                    onFilterChange={setFilterRisk}
                    onRefresh={loadTransactions}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    isLoading={isLoading}
                  />
                  <TransactionTable
                    transactions={filteredTransactions}
                    onSelectTransaction={handleSelectTransaction}
                    onUpdateRisk={handleUpdateRisk}
                    onAddToBlacklist={handleAddToBlacklist}
                    filterRisk={filterRisk}
                    selectedTransactionId={selectedTransaction?.id}
                  />
                </>
              ) : (
                <BlacklistPanel
                  blacklist={blacklist}
                  onRemove={handleRemoveFromBlacklist}
                />
              )}
          </div>
        </main>

        {/* 우측 사이드 패널 - 상세 보고서 (fixed position) */}
        {selectedTransaction && activeTab === "transactions" && (
          <aside className="fixed right-0 top-16 w-[480px] h-[calc(100vh-64px)] overflow-hidden z-30 border-l border-border bg-background shadow-xl">
            <ReportPanel
              transaction={selectedTransaction}
              onClose={handleClosePanel}
              onUpdateRisk={handleUpdateRisk}
              onAddToBlacklist={handleAddToBlacklist}
            />
          </aside>
        )}
      </div>
    </div>
  )
}
