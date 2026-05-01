"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  FileText, 
  User, 
  CreditCard,
  Calendar,
  Shield
} from "lucide-react"
import type { Transaction } from "@/lib/transaction-types"
import type { AIAnalysisReport } from "@/lib/ai-detection"
import { formatAmount, formatDate, getRiskText, getReasonText } from "@/lib/transaction-generator"
import { getRiskColor, generateAIReport } from "@/lib/ai-detection"

interface ReportModalProps {
  transaction: Transaction | null
  open: boolean
  onClose: () => void
}

export function ReportModal({ transaction, open, onClose }: ReportModalProps) {
  if (!transaction) return null

  const report = generateAIReport(transaction)
  const riskColors = getRiskColor(transaction.riskLevel)

  const getRiskIcon = () => {
    switch (transaction.riskLevel) {
      case "warning":
        return <AlertTriangle className="h-5 w-5" />
      case "caution":
        return <AlertCircle className="h-5 w-5" />
      default:
        return <CheckCircle className="h-5 w-5" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-foreground">
            <FileText className="h-5 w-5 text-primary" />
            AI 분석 보고서
            <Badge className={`${riskColors.bg} ${riskColors.text} border ${riskColors.border} ml-auto`}>
              {getRiskIcon()}
              <span className="ml-1">{getRiskText(transaction.riskLevel)}</span>
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            거래 ID: {transaction.id} | {formatDate(transaction.date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* 거래 기본 정보 */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/50 rounded-lg">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">송금인</p>
                  <p className="text-sm text-foreground font-medium">{transaction.senderName}</p>
                  <p className="text-xs text-muted-foreground">{transaction.senderAccount}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">수취인</p>
                  <p className="text-sm text-foreground font-medium">{transaction.recipientName}</p>
                  <p className="text-xs text-muted-foreground">{transaction.recipientAccount}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">거래 일시</p>
                  <p className="text-sm text-foreground font-medium">{formatDate(transaction.date)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">거래 금액</p>
                  <p className="text-lg text-foreground font-bold">{formatAmount(transaction.amount)}</p>
                </div>
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
            <div className="p-4 bg-secondary/50 rounded-lg">
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

          <Separator className="bg-border" />

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-3">
            <Button onClick={onClose}>
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
