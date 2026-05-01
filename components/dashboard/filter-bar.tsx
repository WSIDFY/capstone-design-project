"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, RefreshCw, Filter } from "lucide-react"
import type { RiskLevel } from "@/lib/transaction-types"

interface FilterBarProps {
  filterRisk: RiskLevel | "all"
  onFilterChange: (risk: RiskLevel | "all") => void
  onRefresh: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
  isLoading?: boolean
}

export function FilterBar({
  filterRisk,
  onFilterChange,
  onRefresh,
  searchQuery,
  onSearchChange,
  isLoading = false
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="송금인, 수취인, 계좌번호 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        
        <Select value={filterRisk} onValueChange={(value) => onFilterChange(value as RiskLevel | "all")}>
          <SelectTrigger className="w-[140px] bg-secondary border-border">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="위험도 필터" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="normal">정상</SelectItem>
            <SelectItem value="caution">주의</SelectItem>
            <SelectItem value="warning">경고</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button 
        variant="outline" 
        onClick={onRefresh}
        disabled={isLoading}
        className="border-border"
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        새로고침
      </Button>
    </div>
  )
}
