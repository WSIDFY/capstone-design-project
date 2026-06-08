import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const BACKEND_URL = process.env.BACKEND_API_URL ?? "http://34.22.105.28:8080"

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const body = await request.json()

    const response = await fetch(`${BACKEND_URL}/transactions/${id}/is_blacklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
}