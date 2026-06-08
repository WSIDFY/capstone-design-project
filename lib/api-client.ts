// ============================================
// [DB 조회] 백엔드 API 클라이언트
// ============================================
// 백엔드(localhost:8080)와의 통신을 담당하는 모듈입니다.
// - 타임아웃 처리
// - 자동 재시도 (지수 백오프)
// - 에러 타입 분류 (네트워크/타임아웃/서버/파싱)
// ============================================

import type { BackendTransaction } from "./transaction-types"

// 에러 타입 분류
export type ApiErrorType = "network" | "timeout" | "server" | "parse" | "unknown"

export interface ApiError {
  type: ApiErrorType
  message: string
  status?: number
  detail?: string
}

export interface ApiResult<T> {
  success: boolean
  data?: T
  error?: ApiError
}

// ============================================
// [DB 조회 설정] API 엔드포인트
// 프론트는 Next.js 프록시(/api/transactions)를 거쳐 백엔드를 호출합니다.
// 이렇게 하면 CORS 문제가 원천 차단됩니다.
// ============================================
const PROXY_ENDPOINT = "/api/transactions"

// 타임아웃 (밀리초)
const DEFAULT_TIMEOUT = 10_000

// 최대 재시도 횟수
const MAX_RETRIES = 2

/**
 * 한글 에러 메시지 매핑
 */
export function getErrorMessage(error: ApiError): string {
  switch (error.type) {
    case "network":
      return "백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요. (localhost:8080)"
    case "timeout":
      return "서버 응답 시간이 초과되었습니다. 네트워크 상태를 확인하세요."
    case "server":
      return `서버 오류가 발생했습니다. (HTTP ${error.status ?? "?"})`
    case "parse":
      return "서버 응답 데이터 형식이 올바르지 않습니다."
    default:
      return "알 수 없는 오류가 발생했습니다."
  }
}

/**
 * 지연 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * ============================================
 * [DB 조회] 거래 내역 가져오기 (재시도 포함)
 * ============================================
 * Next.js 프록시(/api/transactions)를 통해 백엔드 거래 내역을 가져옵니다.
 * 실패 시 자동으로 최대 MAX_RETRIES회 재시도합니다.
 */
export async function fetchTransactions(
  options: { timeout?: number; retries?: number } = {}
): Promise<ApiResult<BackendTransaction[]>> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT
  const maxRetries = options.retries ?? MAX_RETRIES

  let lastError: ApiError = { type: "unknown", message: "알 수 없는 오류" }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // 지수 백오프: 1초, 2초, 4초...
      const backoff = 1000 * Math.pow(2, attempt - 1)
      console.warn(`[FDS] API 재시도 ${attempt}/${maxRetries} (${backoff}ms 후)...`)
      await delay(backoff)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      console.log(`[FDS] API 호출 시도 ${attempt + 1}: ${PROXY_ENDPOINT}`)
      const response = await fetch(PROXY_ENDPOINT, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      // 서버 오류 (4xx, 5xx)
      if (!response.ok) {
        lastError = {
          type: "server",
          message: `서버 오류 ${response.status}`,
          status: response.status,
        }
        console.error(`[FDS] 서버 오류: HTTP ${response.status}`)
        // 5xx는 재시도, 4xx는 즉시 중단
        if (response.status >= 400 && response.status < 500) {
          return { success: false, error: lastError }
        }
        continue
      }

      // JSON 파싱
      let data: BackendTransaction[]
      try {
        data = await response.json()
      } catch (parseErr) {
        lastError = {
          type: "parse",
          message: "JSON 파싱 실패",
          detail: String(parseErr),
        }
        console.error("[FDS] JSON 파싱 실패:", parseErr)
        return { success: false, error: lastError }
      }

      // 배열 검증
      if (!Array.isArray(data)) {
        lastError = {
          type: "parse",
          message: "응답이 배열 형식이 아닙니다.",
          detail: `받은 타입: ${typeof data}`,
        }
        console.error("[FDS] 응답이 배열이 아님:", typeof data)
        return { success: false, error: lastError }
      }

      console.log(`[FDS] API 호출 성공: ${data.length}건 수신`)
      return { success: true, data }
    } catch (err) {
      clearTimeout(timeoutId)

      // 타임아웃 (AbortError)
      if (err instanceof DOMException && err.name === "AbortError") {
        lastError = { type: "timeout", message: "요청 시간 초과" }
        console.error(`[FDS] 타임아웃 (${timeout}ms 초과)`)
      } else {
        // 네트워크 오류 (서버 다운, 연결 거부 등)
        lastError = {
          type: "network",
          message: "네트워크 연결 실패",
          detail: String(err),
        }
        console.error("[FDS] 네트워크 오류:", err)
      }
    }
  }

  // 모든 재시도 실패
  console.error("[FDS] 모든 재시도 실패:", lastError)
  return { success: false, error: lastError }
}
// ============================================
