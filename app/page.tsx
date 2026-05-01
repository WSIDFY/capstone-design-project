"use client"

import dynamic from "next/dynamic"

const Dashboard = dynamic(() => import("@/components/dashboard/dashboard-client"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground">시스템 로딩 중...</p>
      </div>
    </div>
  ),
})

export default function DashboardPage() {
  return <Dashboard />
}
