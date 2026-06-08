// ============================================
// [DB 조회] Next.js API 프록시 라우트
// ============================================
// 프론트엔드의 /api/transactions 요청을 백엔드(localhost:8080)로 전달합니다.
// 이 프록시를 사용하면 브라우저 CORS 제약을 우회할 수 있습니다.
//
// 백엔드 주소는 환경변수 BACKEND_API_URL 로 관리합니다.
// (.env.local 파일에 BACKEND_API_URL=http://localhost:8080 추가)
// 환경변수가 없으면 기본값 http://localhost:8080 사용
// ============================================

import { NextResponse } from "next/server"

// 동적 라우트로 설정 (캐시 비활성화 - 항상 최신 데이터)
export const dynamic = "force-dynamic"

// ============================================
// [DB 조회 설정] 백엔드 API 주소
// ============================================
const BACKEND_URL = process.env.BACKEND_API_URL ?? "http://localhost:8080"

export async function GET() {
  try {
    // ============================================
    // [DB 조회] 백엔드 거래 내역 엔드포인트 호출
    // ============================================
    const backendEndpoint = `${BACKEND_URL}/transactions`
    console.log(`[FDS Proxy] 백엔드 호출: ${backendEndpoint}`)

    const response = await fetch(backendEndpoint, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      // 서버 사이드 fetch는 캐시하지 않음
      cache: "no-store",
    })

    if (!response.ok) {
      console.error(`[FDS Proxy] 백엔드 오류: HTTP ${response.status}`)
      return NextResponse.json(
        { error: `백엔드 서버 오류: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log(`[FDS Proxy] 백엔드 응답 성공: ${Array.isArray(data) ? data.length : "?"}건`)

    // 백엔드 데이터를 그대로 프론트로 전달
    return NextResponse.json(data)
    // ============================================
  } catch (error) {
    // 백엔드 서버 다운, 연결 거부 등
    console.error("[FDS Proxy] 백엔드 연결 실패:", error)
    return NextResponse.json(
      {
        error: "백엔드 서버에 연결할 수 없습니다.",
        detail: String(error),
        backendUrl: BACKEND_URL,
      },
      { status: 502 } // Bad Gateway
    )
  }
}
// ============================================
