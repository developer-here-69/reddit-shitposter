import { NextResponse } from "next/server"
import { getDashboardState, saveDashboardState } from "@/lib/storage"

export async function POST(req: Request) {
  try {
    const { postId } = await req.json()
    const state = getDashboardState()

    const post = state.posts.find((p) => p.id === postId)
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const account = state.accounts.find((a) => a.id === post.accountId)
    if (!account) {
      return NextResponse.json({ error: "Assigned account not found" }, { status: 400 })
    }

    // Check if account has credentials
    if (!account.clientId || !account.clientSecret || !account.password) {
      // Return simulated success or prompt for credentials
      return NextResponse.json({
        success: false,
        requiresCredentials: true,
        message: `Account u/${account.username} needs Client ID, Client Secret, and Password configured to post live to Reddit.`,
      })
    }

    // Post to Reddit via standard OAuth2
    const authHeader = Buffer.from(`${account.clientId}:${account.clientSecret}`).toString("base64")
    const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": `python:arresuno-poster:v1.0 (by /u/${account.username})`,
      },
      body: new URLSearchParams({
        grant_type: "password",
        username: account.username,
        password: account.password,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      post.errorMessage = `Reddit auth failed: ${err}`
      post.status = "failed"
      saveDashboardState(state)
      return NextResponse.json({ error: `Auth failed: ${err}` }, { status: 400 })
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    // Submit self-post
    const submitRes = await fetch("https://oauth.reddit.com/api/submit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": `python:arresuno-poster:v1.0 (by /u/${account.username})`,
      },
      body: new URLSearchParams({
        sr: state.subreddit,
        kind: "self",
        title: post.title,
        text: post.body,
        api_type: "json",
      }),
    })

    const submitData = await submitRes.json()
    const permalink = submitData?.json?.data?.url || `https://www.reddit.com/r/${state.subreddit}/`

    post.status = "posted"
    post.redditUrl = permalink
    post.postedAt = new Date().toISOString()
    account.postedToday += 1
    account.lastPostedAt = new Date().toISOString()

    saveDashboardState(state)

    return NextResponse.json({ success: true, url: permalink })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
