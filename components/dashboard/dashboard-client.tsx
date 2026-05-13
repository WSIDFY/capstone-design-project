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
import type { Transaction, RiskLevel, BlacklistEntry, BackendTransaction } from "@/lib/transaction-types"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, AlertCircle, CheckCircle } from "lucide-react"

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

  const loadTransactions = async () => {
    setIsLoading(true)
    try {
      // 백엔드 API에서 거래 내역 가져오기
      // 개발 중: mock 데이터 사용, 배포 시: 실제 API 호출
      const useBackendApi = false // 백엔드 준비 완료 시 true로 변경

      let newTransactions: Transaction[]

      if (useBackendApi) {
        try {
          const response = await fetch("http://localhost:8080/transactions")
          if (!response.ok) throw new Error(`API 오류: ${response.status}`)
          
          const backendData: BackendTransaction[] = await response.json()
          newTransactions = transformBackendTransactions(backendData)
        } catch (error) {
          console.error("[FDS] 백엔드 API 호출 실패, mock 데이터로 폴백:", error)
          // 백엔드 실패 시 mock 데이터로 대체
          newTransactions = generateTransactions(100, 0.15)
        }
      } else {
        // 개발 중: mock 데이터 사용
        newTransactions = generateTransactions(100, 0.15)
      }

      setTransactions(newTransactions)

      // is_blacklist === 1 인 거래를 자동으로 블랙리스트에 추가
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
  }

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

  const handleUpdateRisk = (transactionId: string, newRisk: RiskLevel) => {
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
  }

  const handleSelectTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
  }

  const handleClosePanel = () => {
    setSelectedTransaction(null)
  }

  const handleAddToBlacklist = (transaction: Transaction) => {
    const newEntry: BlacklistEntry = {
      id: `bl-manual-${transaction.id}-${Date.now()}`,
      name: transaction.recipientName,
      accountNumber: transaction.recipientAccount,
      reason: transaction.suspiciousReason !== "none" ? transaction.suspiciousReason : "fraud_account",
      addedAt: new Date(),
      relatedTransactionId: transaction.id
    }
    
    // 중복 체크 - setState 밖에서 체크
    const isDuplicate = blacklist.some(e => e.accountNumber === newEntry.accountNumber)
    
    if (isDuplicate) {
      toast({
        title: "이미 블랙리스트에 등록된 계좌입니다.",
        variant: "destructive",
        duration: 2000,
      })
      return
    }
    
    setBlacklist(prev => [...prev, newEntry])
    toast({
      title: "블랙리스트 등록이 완료되었습니다.",
      description: `계좌: ${newEntry.accountNumber}`,
      duration: 2000,
    })
  }

  const handleRemoveFromBlacklist = (id: string) => {
    setBlacklist(prev => prev.filter(entry => entry.id !== id))
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
