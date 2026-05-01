import type { Transaction, SuspiciousReason, RiskLevel } from "./transaction-types"
import { getReasonText, formatAmount } from "./transaction-generator"

// AI 분석 보고서 타입
export interface AIAnalysisReport {
  transactionId: string
  summary: string
  riskFactors: string[]
  recommendation: string
  detailedAnalysis: string
  relatedPatterns?: string[]
  estimatedLoss?: number
}

// AI 탐지 분석 보고서 생성
export function generateAIReport(transaction: Transaction): AIAnalysisReport {
  const { suspiciousReason, riskLevel, amount, aiConfidence } = transaction
  
  const report: AIAnalysisReport = {
    transactionId: transaction.id,
    summary: "",
    riskFactors: [],
    recommendation: "",
    detailedAnalysis: "",
    relatedPatterns: []
  }
  
  switch (suspiciousReason) {
    case "first_large_transfer":
      report.summary = `신규 수취인에게 ${formatAmount(amount)}의 고액 이체가 감지되었습니다.`
      report.riskFactors = [
        "해당 수취인과의 거래 이력이 전무함",
        `평균 거래 금액 대비 ${Math.round(amount / 100000)}배 이상의 고액`,
        "보이스피싱 패턴과 유사한 거래 특성"
      ]
      report.recommendation = riskLevel === "warning" 
        ? "즉시 고객 연락을 통한 거래 의도 확인 필요" 
        : "추가 모니터링 및 거래 패턴 관찰 권장"
      report.detailedAnalysis = `
본 거래는 AI 모델에 의해 ${aiConfidence}%의 신뢰도로 의심거래로 분류되었습니다.

[분석 근거]
1. 거래 이력 분석: 송금인 계좌(${transaction.senderAccount})와 수취인 계좌(${transaction.recipientAccount}) 간 이전 거래 기록이 없습니다.
2. 금액 이상치 분석: ${formatAmount(amount)}는 해당 계좌의 일반적인 거래 패턴에서 현저히 벗어난 금액입니다.
3. 시간대 분석: 보이스피싱 사기가 빈번하게 발생하는 시간대와 일치합니다.
4. 유사 사례 매칭: 최근 3개월간 신고된 보이스피싱 사례 중 ${Math.floor(Math.random() * 30) + 70}%와 유사한 패턴을 보입니다.

[위험 평가]
- 보이스피싱 가능성: ${riskLevel === "warning" ? "높음" : "중간"}
- 예상 피해 금액: ${formatAmount(amount)}
- 긴급도: ${riskLevel === "warning" ? "즉시 조치 필요" : "24시간 내 확인 권장"}
      `.trim()
      report.relatedPatterns = [
        "검찰/경찰 사칭 사기",
        "대출 사기",
        "가족 납치 협박"
      ]
      report.estimatedLoss = amount
      break
      
    case "unusual_location":
      report.summary = `비정상 위치(${transaction.location})에서 결제가 감지되었습니다.`
      report.riskFactors = [
        `평소 결제 지역과 ${transaction.location}은 지리적으로 상이함`,
        "단시간 내 원거리 이동 불가능한 패턴",
        "카드 도난/복제 가능성"
      ]
      report.recommendation = "카드 소유자에게 연락하여 본인 결제 여부 확인 필요"
      report.detailedAnalysis = `
본 거래는 AI 모델에 의해 ${aiConfidence}%의 신뢰도로 카드 도난 의심거래로 분류되었습니다.

[분석 근거]
1. 위치 분석: 이전 결제 위치와 현재 결제 위치(${transaction.location}) 간 물리적 이동이 불가능한 시간 내 발생
2. 결제 패턴: 평소 결제 습관과 상이한 업종/시간대에서 결제 발생
3. 연속 결제: 유사 시간대에 ${Math.floor(Math.random() * 5) + 2}건의 연속 결제 시도 감지

[위험 평가]
- 카드 도난/복제 가능성: ${aiConfidence > 80 ? "높음" : "중간"}
- 불법 사용 추정 금액: ${formatAmount(amount)}
- 권장 조치: 카드 일시 정지 후 본인 확인
      `.trim()
      report.relatedPatterns = [
        "카드 복제",
        "온라인 정보 유출",
        "분실 카드 도용"
      ]
      break
      
    case "fraud_account":
      report.summary = `신고된 사기계좌(${transaction.recipientAccount})로의 송금이 감지되었습니다.`
      report.riskFactors = [
        "수취인 계좌가 금융사기 신고 데이터베이스에 등록됨",
        "다수의 피해 신고가 접수된 계좌",
        "즉각적인 조치가 필요한 고위험 거래"
      ]
      report.recommendation = "거래 즉시 중단 및 고객 긴급 연락 권장"
      report.detailedAnalysis = `
본 거래는 AI 모델에 의해 ${aiConfidence}%의 신뢰도로 사기 의심거래로 분류되었습니다.

[분석 근거]
1. 블랙리스트 매칭: 수취인 계좌(${transaction.recipientAccount})가 금융감독원 신고 사기계좌 목록에 등재
2. 신고 이력: 해당 계좌로 최근 ${Math.floor(Math.random() * 20) + 5}건의 사기 피해 신고 접수
3. 피해 총액: 누적 피해 금액 약 ${formatAmount(Math.floor(Math.random() * 500000000) + 100000000)}

[위험 평가]
- 사기 가능성: 매우 높음
- 현재 거래 금액: ${formatAmount(amount)}
- 긴급도: 즉시 조치 필수
      `.trim()
      report.relatedPatterns = [
        "투자 사기",
        "로맨스 스캠",
        "취업 사기"
      ]
      report.estimatedLoss = amount
      break
      
    case "money_laundering":
      report.summary = `자금세탁이 의심되는 ${formatAmount(amount)} 규모의 거래가 감지되었습니다.`
      report.riskFactors = [
        "비정상적으로 큰 거래 금액",
        "복잡한 자금 이동 경로 패턴",
        "분할 송금 후 합산 패턴 감지"
      ]
      report.recommendation = "거래 목적 확인 및 자금 출처 증빙 요청 필요"
      report.detailedAnalysis = `
본 거래는 AI 모델에 의해 ${aiConfidence}%의 신뢰도로 자금세탁 의심거래로 분류되었습니다.

[분석 근거]
1. 금액 분석: ${formatAmount(amount)}는 고액현금거래보고(CTR) 기준을 초과
2. 거래 패턴: 스머핑(Smurfing) 또는 구조화(Structuring) 패턴 감지
3. 관계 분석: 송금인과 수취인 간 명확한 경제적 관계 미확인

[자금세탁 유형 분석]
- 배치 단계(Placement): 불법 자금의 금융 시스템 유입 의심
- 레이어링 단계(Layering): 복잡한 거래 구조를 통한 추적 회피 시도
- 통합 단계(Integration): 합법적 거래로 위장 가능성

[위험 평가]
- 자금세탁 가능성: ${riskLevel === "warning" ? "높음" : "중간"}
- 거래 금액: ${formatAmount(amount)}
- 법적 보고 의무: 의심거래보고(STR) 대상 여부 검토 필요
      `.trim()
      report.relatedPatterns = [
        "스머핑 (분할 예금)",
        "페이퍼 컴퍼니 활용",
        "해외 송금 세탁"
      ]
      break
      
    default:
      report.summary = "정상 거래로 분류되었습니다."
      report.riskFactors = []
      report.recommendation = "특별한 조치가 필요하지 않습니다."
      report.detailedAnalysis = "본 거래는 정상적인 거래 패턴 범위 내에 있습니다."
  }
  
  return report
}

// 위험도 색상 반환
export function getRiskColor(level: RiskLevel): { bg: string; text: string; border: string } {
  switch (level) {
    case "warning":
      return { 
        bg: "bg-destructive/20", 
        text: "text-destructive", 
        border: "border-destructive/50" 
      }
    case "caution":
      return { 
        bg: "bg-warning/20", 
        text: "text-warning", 
        border: "border-warning/50" 
      }
    default:
      return { 
        bg: "bg-success/20", 
        text: "text-success", 
        border: "border-success/50" 
      }
  }
}

// 위험도 아이콘 반환
export function getRiskIcon(level: RiskLevel): string {
  switch (level) {
    case "warning":
      return "AlertTriangle"
    case "caution":
      return "AlertCircle"
    default:
      return "CheckCircle"
  }
}
