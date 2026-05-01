"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, AlertTriangle, AlertCircle, CheckCircle, TrendingUp } from "lucide-react"
import { formatAmount } from "@/lib/transaction-generator"
import type { DashboardStats } from "@/lib/transaction-types"

interface StatsCardsProps {
  stats: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "총 거래 건수",
      value: stats.totalTransactions.toLocaleString(),
      subtitle: `총 ${formatAmount(stats.totalAmount)}`,
      icon: Activity,
      color: "text-primary"
    },
    {
      title: "정상 거래",
      value: stats.normalCount.toLocaleString(),
      subtitle: `${((stats.normalCount / stats.totalTransactions) * 100).toFixed(1)}%`,
      icon: CheckCircle,
      color: "text-success"
    },
    {
      title: "주의 거래",
      value: stats.cautionCount.toLocaleString(),
      subtitle: `${((stats.cautionCount / stats.totalTransactions) * 100).toFixed(1)}%`,
      icon: AlertCircle,
      color: "text-warning"
    },
    {
      title: "경고 거래",
      value: stats.warningCount.toLocaleString(),
      subtitle: `${((stats.warningCount / stats.totalTransactions) * 100).toFixed(1)}%`,
      icon: AlertTriangle,
      color: "text-destructive"
    }
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{card.value}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              {card.subtitle}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
