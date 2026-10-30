import { NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"
import fs from "fs"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const profileName = searchParams.get("profileName") || "account_1"

    const sessionFile = path.resolve(process.cwd(), "..", "backend", "browser_sessions", `${profileName}_state.json`)
    const exists = fs.existsSync(sessionFile) && fs.statSync(sessionFile).size > 20

    return NextResponse.json({
      success: true,
      profileName,
      isAuthenticated: exists,
      sessionFile: exists ? sessionFile : null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { profileName = "account_1" } = await req.json()

    const backendDir = path.resolve(process.cwd(), "..", "backend")
    const venvPythonw = path.resolve(process.cwd(), "..", ".venv", "Scripts", "pythonw.exe")
    const venvPython = fs.existsSync(venvPythonw)
      ? venvPythonw
      : path.resolve(process.cwd(), "..", ".venv", "Scripts", "python.exe")
    const profileDir = path.resolve(backendDir, "browser_profiles", profileName)

    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true })
    }

    // Remove any orphaned lockfile if present
    const lockfile = path.join(profileDir, "lockfile")
    if (fs.existsSync(lockfile)) {
      try {
        fs.unlinkSync(lockfile)
      } catch {
        // Ignored if actively locked
      }
    }

    // Launch python browser poster in login mode (opens real Google Chrome with persistent context)
    // pythonw.exe + windowsHide: true guarantees NO black CMD/Terminal window pops up!
    const child = spawn(
      venvPython,
      ["-m", "src.browser_poster", "--login", profileName],
      {
        cwd: backendDir,
        detached: true,
        stdio: "ignore",
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
        },
      }
    )
    child.unref()

    return NextResponse.json({
      success: true,
      message: `Real Google Chrome opened for ${profileName}! Please log in to Reddit using Google or credentials in that window.`,
      profileName,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to launch Google Chrome" }, { status: 500 })
  }
}
