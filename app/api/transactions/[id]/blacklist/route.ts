import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const BACKEND_URL = process.env.BACKEND_API_URL ?? "http://localhost:8080"

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const body = await request.json()

    const response = await fetch(`${BACKEND_URL}/transactions/${id}/blacklist`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        })

    const data = await response.json()

        return NextResponse.json(data, { status: response.status })
    } catch (error) {
    console.error("[FDS Proxy BLACKLIST PATCH] 실패:", error)
        return NextResponse.json(
        {
            error: "블랙리스트 수정 프록시 실패",
            detail: String(error),
        },
        { status: 500 }
        )
    }
}
