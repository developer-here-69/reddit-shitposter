import { NextResponse } from "next/server"
import { getDashboardState, saveDashboardState } from "@/lib/storage"
import { QueuePost } from "@/lib/types"

export async function GET() {
  const state = getDashboardState()
  return NextResponse.json({
    posts: state.posts,
    subreddit: state.subreddit,
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const state = getDashboardState()

    const newPost: QueuePost = {
      id: "post_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      title: body.title?.trim() || "Untitled Discussion",
      body: body.body?.trim() || "",
      category: body.category || "relatable_life",
      accountId: body.accountId || (state.accounts[0]?.id ?? "acc_1"),
      scheduledAt: body.scheduledAt || new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
      status: "queued",
      order: state.posts.length + 1,
      createdAt: new Date().toISOString(),
    }

    state.posts.push(newPost)
    saveDashboardState(state)

    return NextResponse.json({ success: true, post: newPost })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const state = getDashboardState()

    if (body.action === "reorder" && Array.isArray(body.posts)) {
      state.posts = body.posts
      saveDashboardState(state)
      return NextResponse.json({ success: true, posts: state.posts })
    }

    if (body.id) {
      const idx = state.posts.findIndex((p) => p.id === body.id)
      if (idx !== -1) {
        state.posts[idx] = {
          ...state.posts[idx],
          title: body.title !== undefined ? body.title : state.posts[idx].title,
          body: body.body !== undefined ? body.body : state.posts[idx].body,
          scheduledAt: body.scheduledAt || state.posts[idx].scheduledAt,
          accountId: body.accountId || state.posts[idx].accountId,
          category: body.category || state.posts[idx].category,
          status: body.status || state.posts[idx].status,
        }
        saveDashboardState(state)
        return NextResponse.json({ success: true, post: state.posts[idx] })
      }
    }

    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Missing post id" }, { status: 400 })
    }

    const state = getDashboardState()
    state.posts = state.posts.filter((p) => p.id !== id)
    saveDashboardState(state)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
