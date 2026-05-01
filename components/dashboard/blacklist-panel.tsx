"use client"

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
import { UserX, Trash2, AlertTriangle } from "lucide-react"
import type { BlacklistEntry } from "@/lib/transaction-types"
import { getReasonText } from "@/lib/transaction-generator"

interface BlacklistPanelProps {
  blacklist: BlacklistEntry[]
  onRemove: (id: string) => void
}

export function BlacklistPanel({ blacklist, onRemove }: BlacklistPanelProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date)
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <UserX className="h-5 w-5 text-destructive" />
          <span>블랙리스트 관리</span>
          {blacklist.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {blacklist.length}명
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {blacklist.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>등록된 블랙리스트가 없습니다.</p>
            <p className="text-sm mt-1">사기계좌로 분류된 거래의 계좌 주인이 자동으로 추가됩니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">이름</TableHead>
                  <TableHead className="text-muted-foreground">계좌번호</TableHead>
                  <TableHead className="text-muted-foreground">등록 사유</TableHead>
                  <TableHead className="text-muted-foreground">등록 일시</TableHead>
                  <TableHead className="text-muted-foreground text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blacklist.map((entry) => (
                  <TableRow key={entry.id} className="border-border hover:bg-secondary/50">
                    <TableCell className="text-foreground font-medium">
                      {entry.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {entry.accountNumber}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">
                        {getReasonText(entry.reason)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(entry.addedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onRemove(entry.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        해제
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
