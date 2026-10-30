import { NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"

export async function POST(req: Request) {
  try {
    const { profileName = "account_1" } = await req.json()

    const backendDir = path.resolve(process.cwd(), "..", "backend")
    const venvPython = path.resolve(process.cwd(), "..", ".venv", "Scripts", "python.exe")

    // Spawn detached process so it opens a real Chrome window for the user to log in
    const child = spawn(
      venvPython,
      ["-m", "src.browser_poster", "--login", profileName],
      {
        cwd: backendDir,
        detached: true,
        stdio: "ignore",
      }
    )
    child.unref()

    return NextResponse.json({
      success: true,
      message: `Chrome opened for ${profileName}. Log in to Reddit in the browser window, then close it when done!`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to open login browser" }, { status: 500 })
  }
}
