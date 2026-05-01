"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  FileText, 
  User, 
  CreditCard,
  Calendar,
  Shield,
  X,
  ChevronDown,
  UserX
} from "lucide-react"
import type { Transaction, RiskLevel } from "@/lib/transaction-types"
import { formatAmount, formatDate, getRiskText, getReasonText } from "@/lib/transaction-generator"
import { getRiskColor, generateAIReport } from "@/lib/ai-detection"

interface ReportPanelProps {
  transaction: Transaction | null
  onClose: () => void
  onUpdateRisk: (transactionId: string, newRisk: RiskLevel) => void
  onAddToBlacklist: (transaction: Transaction) => void
}

export function ReportPanel({ transaction, onClose, onUpdateRisk, onAddToBlacklist }: ReportPanelProps) {
  if (!transaction) return null

  const report = generateAIReport(transaction)
  const riskColors = getRiskColor(transaction.riskLevel)

  const getRiskIcon = () => {
    switch (transaction.riskLevel) {
      case "warning":
        return <AlertTriangle className="h-4 w-4" />
      case "caution":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <CheckCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* 헤더 - sticky */}
      <div className="sticky top-0 z-10 bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">AI 분석 보고서</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            거래 ID: {transaction.id}
          </p>
          <Badge className={`${riskColors.bg} ${riskColors.text} border ${riskColors.border} flex items-center gap-1`}>
            {getRiskIcon()}
            {getRiskText(transaction.riskLevel)}
            {transaction.operatorAssigned && <span className="text-xs">(수동)</span>}
          </Badge>
        </div>
      </div>

      {/* 본문 - 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* 거래 기본 정보 */}
        <div className="space-y-3 p-4 bg-secondary/50 rounded-lg">
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">송금인</p>
              <p className="text-sm text-foreground font-medium">{transaction.senderName}</p>
              <p className="text-xs text-muted-foreground">{transaction.senderAccount}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">수취인</p>
              <p className="text-sm text-foreground font-medium">{transaction.recipientName}</p>
              <p className="text-xs text-muted-foreground">{transaction.recipientAccount}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">거래 일시</p>
              <p className="text-sm text-foreground font-medium">{formatDate(transaction.date)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">거래 금액</p>
              <p className="text-lg text-foreground font-bold">{formatAmount(transaction.amount)}</p>
            </div>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* AI 분석 요약 */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            탐지 요약
          </h3>
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm text-foreground">{report.summary}</p>
            <p className="text-xs text-muted-foreground mt-2">
              탐지 사유: {getReasonText(transaction.suspiciousReason)}
            </p>
          </div>
        </div>

        {/* 위험 요인 */}
        {report.riskFactors.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">위험 요인</h3>
            <ul className="space-y-2">
              {report.riskFactors.map((factor, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-destructive mt-0.5">•</span>
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 상세 분석 */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">상세 분석 내용</h3>
          <div className="p-3 bg-secondary/50 rounded-lg">
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
              {report.detailedAnalysis}
            </pre>
          </div>
        </div>

        {/* 관련 패턴 */}
        {report.relatedPatterns && report.relatedPatterns.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">관련 의심 패턴</h3>
            <div className="flex flex-wrap gap-2">
              {report.relatedPatterns.map((pattern, index) => (
                <Badge key={index} variant="secondary" className="bg-secondary text-secondary-foreground">
                  {pattern}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 권장 조치 */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">권장 조치</h3>
          <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-sm text-foreground">{report.recommendation}</p>
          </div>
        </div>

        {/* 예상 피해 금액 */}
        {report.estimatedLoss && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-xs text-muted-foreground">예상 피해 금액</p>
            <p className="text-2xl font-bold text-destructive">
              {formatAmount(report.estimatedLoss)}
            </p>
          </div>
        )}
      </div>

      {/* 하단 액션 버튼 - sticky */}
      <div className="sticky bottom-0 bg-card border-t border-border p-4 space-y-3">
        {/* 위험도 변경 드롭다운 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                {getRiskIcon()}
                위험도 변경: {getRiskText(transaction.riskLevel)}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-full bg-popover border-border">
            <DropdownMenuItem 
              onClick={() => onUpdateRisk(transaction.id, "normal")}
              className="cursor-pointer"
            >
              <CheckCircle className="mr-2 h-4 w-4 text-success" />
              <span className="text-success">정상으로 변경</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onUpdateRisk(transaction.id, "caution")}
              className="cursor-pointer"
            >
              <AlertCircle className="mr-2 h-4 w-4 text-warning" />
              <span className="text-warning">주의로 변경</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onUpdateRisk(transaction.id, "warning")}
              className="cursor-pointer"
            >
              <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />
              <span className="text-destructive">경고로 변경</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 블랙리스트 추가 버튼 */}
        <Button 
          variant="destructive" 
          className="w-full"
          onClick={() => onAddToBlacklist(transaction)}
        >
          <UserX className="mr-2 h-4 w-4" />
          수취인 블랙리스트 등록
        </Button>
      </div>
    </div>
  )
}
