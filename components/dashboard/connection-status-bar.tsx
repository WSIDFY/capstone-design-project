"use client"

// ============================================
// [DB 조회] 백엔드 연결 상태 표시 컴포넌트
// ============================================
// 백엔드 연결 상태를 시각적으로 표시하고, 재시도 버튼과 에러 로그를 제공합니다.
// ============================================

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Wifi, WifiOff, Loader2, RefreshCw, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error" | "mock"

export interface ConnectionLog {
  time: string
  level: "info" | "warn" | "error"
  message: string
}

interface ConnectionStatusBarProps {
  status: ConnectionStatus
  dataCount: number
  errorMessage?: string
  logs: ConnectionLog[]
  onRetry: () => void
}

export function ConnectionStatusBar({
  status,
  dataCount,
  errorMessage,
  logs,
  onRetry,
}: ConnectionStatusBarProps) {
  const [showLogs, setShowLogs] = useState(false)

  const statusConfig = {
    idle: {
      Icon: Wifi,
      label: "대기 중",
      bg: "bg-secondary",
      text: "text-muted-foreground",
      dot: "bg-muted-foreground",
    },
    connecting: {
      Icon: Loader2,
      label: "백엔드 연결 중...",
      bg: "bg-secondary",
      text: "text-foreground",
      dot: "bg-warning",
    },
    connected: {
      Icon: Wifi,
      label: `백엔드 연결됨 (${dataCount}건)`,
      bg: "bg-success/15",
      text: "text-success",
      dot: "bg-success",
    },
    error: {
      Icon: WifiOff,
      label: "백엔드 연결 실패",
      bg: "bg-destructive/15",
      text: "text-destructive",
      dot: "bg-destructive",
    },
    mock: {
      Icon: AlertTriangle,
      label: `더미데이터 모드 (${dataCount}건)`,
      bg: "bg-warning/15",
      text: "text-warning",
      dot: "bg-warning",
    },
  }

  const cfg = statusConfig[status]
  const hasLogs = logs.length > 0

  return (
    <div className={`rounded-lg border border-border ${cfg.bg} transition-colors`}>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {status === "connecting" && (
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${cfg.dot} opacity-75`} />
            )}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
          </span>
          <cfg.Icon className={`h-4 w-4 ${cfg.text} ${status === "connecting" ? "animate-spin" : ""}`} />
          <span className={`text-sm font-medium ${cfg.text}`}>{cfg.label}</span>
        </div>

        <div className="flex items-center gap-2">
          {hasLogs && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLogs((v) => !v)}
              className="h-7 gap-1 text-xs text-muted-foreground"
            >
              로그 {logs.length}
              {showLogs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
          {(status === "error" || status === "mock") && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-7 gap-1 text-xs border-border"
            >
              <RefreshCw className="h-3 w-3" />
              재연결
            </Button>
          )}
        </div>
      </div>

      {/* 에러 메시지 */}
      {status === "error" && errorMessage && (
        <div className="border-t border-border px-4 py-2">
          <p className="text-xs text-destructive">{errorMessage}</p>
        </div>
      )}

      {/* 로그 패널 */}
      {showLogs && hasLogs && (
        <div className="border-t border-border max-h-48 overflow-y-auto">
          <div className="px-4 py-2 space-y-1 font-mono text-xs">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-muted-foreground shrink-0">{log.time}</span>
                <span
                  className={
                    log.level === "error"
                      ? "text-destructive"
                      : log.level === "warn"
                        ? "text-warning"
                        : "text-muted-foreground"
                  }
                >
                  [{log.level.toUpperCase()}]
                </span>
                <span className="text-foreground break-all">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
// ============================================
