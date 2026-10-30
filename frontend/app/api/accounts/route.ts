import { NextResponse } from "next/server"
import { getDashboardState, saveDashboardState } from "@/lib/storage"
import { RedditAccount } from "@/lib/types"

const ACC_COLORS = ["#ff4500", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"]

export async function GET() {
  const state = getDashboardState()
  return NextResponse.json({ accounts: state.accounts })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const state = getDashboardState()

    const username = (body.username || "").replace(/^u\//, "").trim()
    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    const newAccount: RedditAccount = {
      id: "acc_" + Date.now().toString(36),
      username,
      clientId: (body.clientId || "").trim(),
      clientSecret: (body.clientSecret || "").trim(),
      password: (body.password || "").trim(),
      isActive: true,
      dailyLimit: Number(body.dailyLimit) || 2,
      postedToday: 0,
      color: ACC_COLORS[state.accounts.length % ACC_COLORS.length],
    }

    state.accounts.push(newAccount)
    saveDashboardState(state)

    return NextResponse.json({ success: true, account: newAccount })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const state = getDashboardState()

    const idx = state.accounts.findIndex((a) => a.id === body.id)
    if (idx === -1) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    state.accounts[idx] = {
      ...state.accounts[idx],
      username: body.username ? body.username.replace(/^u\//, "").trim() : state.accounts[idx].username,
      clientId: body.clientId !== undefined ? body.clientId.trim() : state.accounts[idx].clientId,
      clientSecret: body.clientSecret !== undefined ? body.clientSecret.trim() : state.accounts[idx].clientSecret,
      password: body.password !== undefined ? body.password.trim() : state.accounts[idx].password,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : state.accounts[idx].isActive,
      dailyLimit: body.dailyLimit !== undefined ? Number(body.dailyLimit) : state.accounts[idx].dailyLimit,
    }

    saveDashboardState(state)
    return NextResponse.json({ success: true, account: state.accounts[idx] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Missing account id" }, { status: 400 })
    }

    const state = getDashboardState()
    if (state.accounts.length <= 1) {
      return NextResponse.json({ error: "Cannot delete the only account in queue" }, { status: 400 })
    }

    state.accounts = state.accounts.filter((a) => a.id !== id)
    // Reassign posts of deleted account to first available account
    const fallbackId = state.accounts[0].id
    state.posts.forEach((p) => {
      if (p.accountId === id) {
        p.accountId = fallbackId
      }
    })

    saveDashboardState(state)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
