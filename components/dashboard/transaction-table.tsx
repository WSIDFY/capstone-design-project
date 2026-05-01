"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertTriangle, AlertCircle, CheckCircle, MoreHorizontal, FileText, UserX } from "lucide-react"
import type { Transaction, RiskLevel } from "@/lib/transaction-types"
import { formatAmount, formatDate, getRiskText, getReasonText } from "@/lib/transaction-generator"
import { getRiskColor } from "@/lib/ai-detection"

interface TransactionTableProps {
  transactions: Transaction[]
  onSelectTransaction: (transaction: Transaction) => void
  onUpdateRisk: (transactionId: string, newRisk: RiskLevel) => void
  onAddToBlacklist: (transaction: Transaction) => void
  filterRisk?: RiskLevel | "all"
  selectedTransactionId?: string | null
}

export function TransactionTable({ 
  transactions, 
  onSelectTransaction, 
  onUpdateRisk,
  onAddToBlacklist,
  filterRisk = "all",
  selectedTransactionId
}: TransactionTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  const filteredTransactions = filterRisk === "all" 
    ? transactions 
    : transactions.filter(tx => tx.riskLevel === filterRisk)
  
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage)

  const getRiskIcon = (level: RiskLevel) => {
    switch (level) {
      case "warning":
        return <AlertTriangle className="h-4 w-4" />
      case "caution":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <CheckCircle className="h-4 w-4" />
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center justify-between">
          <span>거래 내역</span>
          <span className="text-sm font-normal text-muted-foreground">
            총 {filteredTransactions.length}건
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">거래일시</TableHead>
                <TableHead className="text-muted-foreground">송금인</TableHead>
                <TableHead className="text-muted-foreground">수취인</TableHead>
                <TableHead className="text-muted-foreground text-right">금액</TableHead>
                <TableHead className="text-muted-foreground">위험도</TableHead>
                <TableHead className="text-muted-foreground">탐지 사유</TableHead>
                <TableHead className="text-muted-foreground text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((tx) => {
                const riskColors = getRiskColor(tx.riskLevel)
                return (
                  <TableRow 
                    key={tx.id} 
                    className={`border-border cursor-pointer transition-all duration-150 hover:bg-primary/10 hover:shadow-sm ${
                      selectedTransactionId === tx.id
                        ? "bg-primary/15 border-l-2 border-l-primary"
                        : "border-l-2 border-l-transparent"
                    }`}
                    onClick={() => onSelectTransaction(tx)}
                  >
                    <TableCell className="text-foreground text-sm">
                      {formatDate(tx.date)}
                    </TableCell>
                    <TableCell>
                      <div className="text-foreground text-sm">{tx.senderName}</div>
                      <div className="text-muted-foreground text-xs">{tx.senderAccount}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-foreground text-sm">{tx.recipientName}</div>
                      <div className="text-muted-foreground text-xs">{tx.recipientAccount}</div>
                    </TableCell>
                    <TableCell className="text-foreground text-right font-medium">
                      {formatAmount(tx.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={`${riskColors.bg} ${riskColors.text} border ${riskColors.border} flex items-center gap-1 w-fit`}
                      >
                        {getRiskIcon(tx.riskLevel)}
                        {getRiskText(tx.riskLevel)}
                        {tx.operatorAssigned && (
                          <span className="ml-1 text-xs">(수동)</span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {getReasonText(tx.suspiciousReason)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border">
                          <DropdownMenuItem 
                            onClick={() => onSelectTransaction(tx)}
                            className="cursor-pointer"
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            상세 보고서
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onAddToBlacklist(tx)}
                            className="cursor-pointer text-destructive"
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            블랙리스트 등록
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onUpdateRisk(tx.id, "normal")}
                            className="cursor-pointer text-success"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            정상으로 변경
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onUpdateRisk(tx.id, "caution")}
                            className="cursor-pointer text-warning"
                          >
                            <AlertCircle className="mr-2 h-4 w-4" />
                            주의로 변경
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onUpdateRisk(tx.id, "warning")}
                            className="cursor-pointer text-destructive"
                          >
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            경고로 변경
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        
        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTransactions.length)} / {filteredTransactions.length}건
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                이전
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                다음
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
