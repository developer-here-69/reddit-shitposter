import { NextResponse } from "next/server"
import { getDashboardState, saveDashboardState } from "@/lib/storage"
import { exec } from "child_process"
import path from "path"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST(req: Request) {
  try {
    const { postId, profileName = "account_1", headless = false } = await req.json()
    const state = getDashboardState()

    const post = state.posts.find((p) => p.id === postId)
    if (!post) {
      return NextResponse.json({ error: "Post not found in queue" }, { status: 404 })
    }

    const backendDir = path.resolve(process.cwd(), "..", "backend")
    const venvPython = path.resolve(process.cwd(), "..", ".venv", "Scripts", "python.exe")

    // Escape quotes in title and body for CLI
    const safeTitle = post.title.replace(/"/g, '\\"')
    const safeBody = post.body.replace(/"/g, '\\"')

    const cmd = `"${venvPython}" -m src.browser_poster --post "${profileName}" --title "${safeTitle}" --body "${safeBody}" --subreddit "${state.subreddit}" ${headless ? "--headless" : ""}`

    const { stdout, stderr } = await execAsync(cmd, { cwd: backendDir, timeout: 60000 })

    // Find JSON result from output
    const jsonMatch = stdout.match(/Result:\s*(\{[\s\S]*?\})/m)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[1])
      if (result.success) {
        post.status = "posted"
        post.redditUrl = result.url
        post.postedAt = new Date().toISOString()
        saveDashboardState(state)
        return NextResponse.json({ success: true, url: result.url, profile: profileName })
      } else {
        return NextResponse.json({ success: false, error: result.error || "Browser post failed" }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true, message: "Browser poster launched", output: stdout })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to execute browser poster" }, { status: 500 })
  }
}
