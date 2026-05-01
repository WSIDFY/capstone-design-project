"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"
import type { DashboardStats } from "@/lib/transaction-types"

interface RiskChartsProps {
  stats: DashboardStats
}

export function RiskCharts({ stats }: RiskChartsProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const pieData = [
    { name: "정상", value: stats.normalCount, color: "#22c55e" },
    { name: "주의", value: stats.cautionCount, color: "#eab308" },
    { name: "경고", value: stats.warningCount, color: "#ef4444" },
  ]

  const reasonColorMap: Record<string, string> = {
    "보이스피싱": "#8b5cf6",
    "카드도난": "#06b6d4",
    "사기계좌": "#ef4444",
    "자금세탁": "#f97316",
  }

  const reasonData = [
    { 
      name: "보이스피싱", 
      count: stats.suspiciousByReason.first_large_transfer,
      fill: "#8b5cf6"
    },
    { 
      name: "카드도난", 
      count: stats.suspiciousByReason.unusual_location,
      fill: "#06b6d4"
    },
    { 
      name: "사기계좌", 
      count: stats.suspiciousByReason.fraud_account,
      fill: "#ef4444"
    },
    { 
      name: "자금세탁", 
      count: stats.suspiciousByReason.money_laundering,
      fill: "#f97316"
    },
  ].filter(d => d.count > 0)

  const CustomYAxisTick = ({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
    const color = reasonColorMap[payload.value] || "#a0a0b0"
    return (
      <text 
        x={x} 
        y={y} 
        dy={4} 
        textAnchor="end" 
        fill={color}
        fontSize={12}
        fontWeight={500}
      >
        {payload.value}
      </text>
    )
  }

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">위험도 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center justify-center">
              <div className="text-muted-foreground">로딩 중...</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">의심거래 유형별 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center justify-center">
              <div className="text-muted-foreground">로딩 중...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* 위험도 분포 파이 차트 */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">위험도 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 250, minWidth: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#1e1e2e",
                    border: "1px solid #3b3b4f",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)"
                  }}
                  itemStyle={{
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 500
                  }}
                  labelStyle={{
                    color: "#a0a0b0",
                    fontSize: "12px",
                    marginBottom: "4px"
                  }}
                  formatter={(value: number, _name: string, props: any) => [
                    <span key="value" style={{ color: props.payload?.color, fontWeight: 600 }}>{value}건</span>,
                    props.payload?.name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {item.name}: {item.value}건
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 의심 유형별 바 차트 */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">의심거래 유형별 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 250, minWidth: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonData} layout="vertical">
                <XAxis 
                  type="number" 
                  stroke="#a0a0b0"
                  tick={{ fill: "#e0e0e0", fontSize: 13, fontWeight: 500 }}
                  axisLine={{ stroke: "#4a4a5a" }}
                  tickLine={{ stroke: "#4a4a5a" }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={CustomYAxisTick}
                  axisLine={{ stroke: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: "#1e1e2e",
                    border: "1px solid #3b3b4f",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)"
                  }}
                  itemStyle={{
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 500
                  }}
                  labelStyle={{
                    color: "#a0a0b0",
                    fontSize: "12px",
                    marginBottom: "4px"
                  }}
                  cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                  formatter={(value: number, _name: string, props: any) => [
                    <span key="value" style={{ color: props.payload?.fill, fontWeight: 600 }}>{value}건</span>,
                    "탐지 건수"
                  ]}
                />
                <Bar 
                  dataKey="count" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              총 의심거래: <span className="text-foreground font-medium">{stats.cautionCount + stats.warningCount}건</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
