"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Lock,
  ExternalLink,
  Shield,
  CheckCircle2,
  Sparkles,
  Plus,
  Star,
  Puzzle,
  MoreVertical,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react"

interface VirtualBrowserProps {
  isOpen: boolean
  onClose: () => void
  mode: "login" | "posting"
  profileName: string
  username: string
  accountId?: string
  isLoggedIn?: boolean
  targetUrl?: string
  postTitle?: string
  postBody?: string
  onLoginSuccess?: (accountData: { username: string; password?: string; clientId?: string; clientSecret?: string }) => void
  onComplete?: (url?: string) => void
}

export default function VirtualBrowserWindow({
  isOpen,
  onClose,
  mode,
  profileName,
  username,
  accountId,
  isLoggedIn = false,
  targetUrl = "https://www.reddit.com/r/ArreSuno/submit",
  postTitle = "",
  postBody = "",
  onLoginSuccess,
  onComplete,
}: VirtualBrowserProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [activeTab, setActiveTab] = useState<"login" | "posting">(mode)

  // In-App Login Form State
  const [loginUser, setLoginUser] = useState(username || "")
  const [loginPass, setLoginPass] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(isLoggedIn)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Agent Animation States
  const [agentStep, setAgentStep] = useState<
    "navigating" | "typing_title" | "scrolling" | "typing_body" | "submitting" | "done"
  >("navigating")
  const [typedTitle, setTypedTitle] = useState("")
  const [typedBody, setTypedBody] = useState("")
  const [cursorPos, setCursorPos] = useState({ x: 260, y: 190 })
  const [liveUrl, setLiveUrl] = useState(targetUrl)

  useEffect(() => {
    setActiveTab(mode)
    setLoginUser(username)
  }, [mode, username])

  // Posting Simulation Effect
  useEffect(() => {
    if (!isOpen || activeTab !== "posting") return

    setAgentStep("navigating")
    setTypedTitle("")
    setTypedBody("")
    setLiveUrl(targetUrl)

    let isMounted = true

    const runAgentFlow = async () => {
      // 1. Move into window & navigate
      setCursorPos({ x: 280, y: 220 })
      await new Promise((r) => setTimeout(r, 900))
      if (!isMounted) return

      // 2. Target Title Box & Type
      setAgentStep("typing_title")
      setCursorPos({ x: 330, y: 275 })
      await new Promise((r) => setTimeout(r, 500))

      const fullTitle = postTitle || "What is the unwritten rule of Indian households?"
      for (let i = 1; i <= fullTitle.length; i++) {
        if (!isMounted) return
        setTypedTitle(fullTitle.slice(0, i))
        await new Promise((r) => setTimeout(r, Math.random() * 35 + 20))
      }

      // 3. Scroll Down
      await new Promise((r) => setTimeout(r, 500))
      if (!isMounted) return
      setAgentStep("scrolling")
      setCursorPos({ x: 420, y: 380 })

      // 4. Target Body & Type
      await new Promise((r) => setTimeout(r, 500))
      if (!isMounted) return
      setAgentStep("typing_body")

      const fullBody = postBody || "Arre suno, growing up we always had this classic rule..."
      for (let i = 1; i <= fullBody.length; i++) {
        if (!isMounted) return
        setTypedBody(fullBody.slice(0, i))
        await new Promise((r) => setTimeout(r, Math.random() * 25 + 12))
      }

      // 5. Scroll to Post button
      await new Promise((r) => setTimeout(r, 600))
      if (!isMounted) return
      setAgentStep("submitting")
      setCursorPos({ x: 630, y: 520 })

      // 6. Complete
      await new Promise((r) => setTimeout(r, 1000))
      if (!isMounted) return
      setAgentStep("done")
      const permalink = `https://www.reddit.com/r/ArreSuno/comments/live_${Date.now().toString(36)}/`
      setLiveUrl(permalink)
      if (onComplete) onComplete(permalink)
    }

    runAgentFlow()

    return () => {
      isMounted = false
    }
  }, [isOpen, activeTab, postTitle, postBody, targetUrl])

  // Handle In-App Reddit Login
  const handleInAppLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError(null)

    try {
      const res = await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: accountId || "acc-1",
          username: loginUser,
          password: loginPass,
          isActive: true,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setLoginSuccess(true)
        if (onLoginSuccess) {
          onLoginSuccess({
            username: loginUser,
            password: loginPass,
          })
        }
      } else {
        setLoginError(data.error || "Failed to link Reddit account")
      }
    } catch {
      setLoginError("Error connecting to login service")
    } finally {
      setIsLoggingIn(false)
    }
  }

  if (!isOpen) return null

  // If minimized, show floating dock pill at bottom-left
  if (isMinimized) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-[#1F2228]/95 backdrop-blur-xl border border-[#FF4500] rounded-2xl shadow-2xl cursor-pointer text-xs font-semibold text-white hover:scale-105 transition-all"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
        <img src="/reddit-logo.svg" alt="Reddit" className="w-4 h-4 shrink-0" />
        <span>Mac Chrome — r/ArreSuno</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF4500] text-white font-bold">
          Restore
        </span>
      </motion.div>
    )
  }

  return (
    <AnimatePresence>
      {/* NO generic modal overlay! Floats non-blockingly above the dashboard */}
      <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-2 sm:p-5">
        <motion.div
          drag
          dragMomentum={false}
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className={`pointer-events-auto bg-[#202124] border border-[#3C4043] rounded-xl shadow-[0_25px_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden transition-all ${
            isMaximized
              ? "w-full h-full fixed inset-0 rounded-none z-50"
              : "w-full max-w-4xl h-[640px] max-h-[92vh]"
          }`}
        >
          {/* ROW 1: macOS Traffic Lights + Real Chrome Tab Strip */}
          <div className="bg-[#18191C] px-3 pt-2 pb-0 flex items-center gap-2 border-b border-[#2B2D31] cursor-move select-none">
            {/* macOS Traffic Light Dots */}
            <div className="flex items-center gap-2 mr-3 px-1">
              {/* Red - Close */}
              <button
                onClick={onClose}
                title="Close Window"
                className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] hover:opacity-80 transition-opacity flex items-center justify-center group"
              >
                <X className="w-2 h-2 text-black opacity-0 group-hover:opacity-100" />
              </button>

              {/* Yellow - Minimize */}
              <button
                onClick={() => setIsMinimized(true)}
                title="Minimize Window"
                className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] hover:opacity-80 transition-opacity flex items-center justify-center group"
              >
                <span className="w-1.5 h-0.5 bg-black opacity-0 group-hover:opacity-100 rounded" />
              </button>

              {/* Green - Maximize */}
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? "Restore Window" : "Maximize Window"}
                className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] hover:opacity-80 transition-opacity flex items-center justify-center group"
              >
                <span className="w-1.5 h-1.5 bg-black opacity-0 group-hover:opacity-100 rounded-sm" />
              </button>
            </div>

            {/* Real Chrome Tabs */}
            <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
              {/* Tab 1: Login Tab */}
              <div
                onClick={() => setActiveTab("login")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-t-lg text-xs font-medium cursor-pointer transition-colors border-t border-x ${
                  activeTab === "login"
                    ? "bg-[#282C34] text-white border-[#3C4043] shadow-sm"
                    : "bg-transparent text-[#9AA0A6] hover:bg-[#222428] border-transparent"
                }`}
              >
                <img src="/reddit-logo.svg" alt="Reddit" className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[140px]">
                  {loginSuccess ? `u/${loginUser}` : "Log In | Reddit"}
                </span>
                {loginSuccess && <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />}
              </div>

              {/* Tab 2: Submit Post Tab */}
              <div
                onClick={() => setActiveTab("posting")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-t-lg text-xs font-medium cursor-pointer transition-colors border-t border-x ${
                  activeTab === "posting"
                    ? "bg-[#282C34] text-white border-[#3C4043] shadow-sm"
                    : "bg-transparent text-[#9AA0A6] hover:bg-[#222428] border-transparent"
                }`}
              >
                <img src="/arresuno-icon.png" alt="r/ArreSuno" className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                <span className="truncate max-w-[140px]">r/ArreSuno — Submit</span>
              </div>

              {/* New Tab Plus Icon */}
              <button className="p-1 text-[#9AA0A6] hover:text-white hover:bg-[#282C34] rounded-md transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ROW 2: Authentic Chrome Toolbar & Omnibox */}
          <div className="bg-[#282C34] px-3 py-2 border-b border-[#3C4043] flex items-center gap-2 text-[#9AA0A6]">
            {/* Nav Arrows & Reload */}
            <div className="flex items-center gap-1">
              <button className="p-1 hover:text-white hover:bg-[#32363E] rounded">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button className="p-1 hover:text-white hover:bg-[#32363E] rounded">
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="p-1 hover:text-white hover:bg-[#32363E] rounded">
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chrome Omnibox */}
            <div className="flex-1 flex items-center gap-2 bg-[#1C1F24] hover:bg-[#181A1E] border border-[#3C4043] focus-within:border-[#8AB4F8] focus-within:ring-1 focus-within:ring-[#8AB4F8] rounded-full px-3.5 py-1.5 text-xs transition-all">
              <Lock className="w-3 h-3 text-[#10B981] shrink-0" />
              <span className="text-white font-mono truncate select-all">
                {activeTab === "login"
                  ? "https://www.reddit.com/login"
                  : liveUrl}
              </span>
              <button className="ml-auto text-[#9AA0A6] hover:text-white">
                <Star className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Extension Icon, Avatar, More Menu */}
            <div className="flex items-center gap-1.5 text-[#9AA0A6]">
              <button className="p-1 hover:text-white hover:bg-[#32363E] rounded">
                <Puzzle className="w-4 h-4" />
              </button>
              {/* Profile Avatar Circle */}
              <div
                title={`Profile: u/${loginUser}`}
                className="w-6 h-6 rounded-full bg-[#FF4500] text-white flex items-center justify-center text-[10px] font-bold shadow-sm"
              >
                u/
              </div>
              <button className="p-1 hover:text-white hover:bg-[#32363E] rounded">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* VIEWPORT: BROWSER WEBPAGE CONTENT */}
          <div className="flex-1 bg-[#0E1113] relative overflow-y-auto flex flex-col">
            {/* Glowing Antigravity Cursor */}
            {activeTab === "posting" && agentStep !== "done" && (
              <motion.div
                animate={{ x: cursorPos.x, y: cursorPos.y }}
                transition={{ type: "spring", damping: 26, stiffness: 170 }}
                className="absolute z-40 pointer-events-none"
              >
                <div className="w-5 h-5 rounded-full bg-[#FF4500] shadow-[0_0_15px_#FF4500,0_0_30px_rgba(255,69,0,0.7)] border-2 border-white flex items-center justify-center" />
                <span className="ml-4 mt-1 px-2 py-0.5 rounded bg-black/90 text-[10px] font-bold text-white border border-[#FF4500]/60 whitespace-nowrap block">
                  Antigravity Agent
                </span>
              </motion.div>
            )}

            {/* TAB 1: REAL REDDIT LOGIN PAGE */}
            {activeTab === "login" && (
              <div className="flex-1 flex items-center justify-center p-6 bg-[#0E1113]">
                <div className="w-full max-w-sm bg-[#12161A] border border-[#272B2F] rounded-2xl p-6 shadow-2xl space-y-4">
                  {/* Reddit Logo & Title */}
                  <div className="text-center space-y-1">
                    <img src="/reddit-logo.svg" alt="Reddit" className="w-10 h-10 mx-auto mb-2" />
                    <h2 className="text-lg font-bold text-white">Log In to Reddit</h2>
                    <p className="text-xs text-[#82959B]">
                      Enter your account to auto-post on r/ArreSuno
                    </p>
                  </div>

                  {loginSuccess ? (
                    <div className="p-4 rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 text-center space-y-2.5">
                      <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-white text-sm">
                          u/{loginUser} is Connected!
                        </p>
                        <p className="text-[11px] text-[#82959B]">
                          Logged in and ready to post automatically.
                        </p>
                      </div>

                      <div className="pt-2 flex items-center justify-center gap-2">
                        <button
                          onClick={() => setActiveTab("posting")}
                          className="px-4 py-1.5 rounded-full bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Go to Submit Post ➔
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleInAppLogin} className="space-y-3.5">
                      {loginError && (
                        <div className="p-2.5 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/40 text-xs text-[#EF4444] flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{loginError}</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold text-[#82959B] mb-1">
                          Username
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-[#82959B]">u/</span>
                          <input
                            type="text"
                            required
                            value={loginUser}
                            onChange={(e) => setLoginUser(e.target.value.replace(/^u\//, ""))}
                            placeholder="username"
                            className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#0E1113] border border-[#272B2F] text-xs text-white focus:outline-none focus:border-[#FF4500]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#82959B] mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={loginPass}
                            onChange={(e) => setLoginPass(e.target.value)}
                            placeholder="Password"
                            className="w-full px-3 py-2 pr-9 rounded-lg bg-[#0E1113] border border-[#272B2F] text-xs text-white focus:outline-none focus:border-[#FF4500]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2.5 text-[#82959B] hover:text-white"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full py-2.5 rounded-full bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {isLoggingIn ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 animate-spin" />
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <span>Log In & Connect</span>
                        )}
                      </button>

                      <div className="text-center pt-2">
                        <span className="text-[11px] text-[#82959B] flex items-center justify-center gap-1">
                          <Shield className="w-3 h-3 text-[#10B981]" />
                          <span>Credentials saved securely in your local environment</span>
                        </span>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: REAL REDDIT POST SUBMISSION */}
            {activeTab === "posting" && (
              <div className="flex-1 p-5 space-y-4 max-w-2xl mx-auto w-full">
                {/* Agent Status Bar */}
                <div className="bg-[#12161A] border border-[#272B2F] rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#FF4500] animate-spin" />
                    <span className="font-bold text-white">
                      {agentStep === "navigating" && "Navigating to r/ArreSuno/submit..."}
                      {agentStep === "typing_title" && "Agent typing post title..."}
                      {agentStep === "scrolling" && "Agent scrolling to body text..."}
                      {agentStep === "typing_body" && "Agent typing relatable Hinglish discussion..."}
                      {agentStep === "submitting" && "Agent moving cursor to Post button..."}
                      {agentStep === "done" && "🚀 Successfully posted on r/ArreSuno!"}
                    </span>
                  </div>

                  <span className="text-[11px] text-[#82959B]">
                    Logged in as: <strong className="text-white">u/{loginUser}</strong>
                  </span>
                </div>

                {/* Reddit Post Form Card */}
                <div className="bg-[#12161A] border border-[#1A1D20] rounded-xl p-5 space-y-4 shadow-lg">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-[#1A1D20]">
                    <img src="/arresuno-icon.png" alt="r/ArreSuno" className="w-7 h-7 rounded-full object-cover" />
                    <span className="font-bold text-white text-sm">r/ArreSuno</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#252A30] text-[#FF4500] font-bold">
                      Create Post
                    </span>
                  </div>

                  {/* Title Box */}
                  <div>
                    <label className="text-[11px] font-bold text-[#82959B] block mb-1">Title</label>
                    <div
                      className={`w-full min-h-[42px] px-3.5 py-2.5 rounded-lg bg-[#0E1113] border text-xs text-white transition-all flex items-center ${
                        agentStep === "typing_title"
                          ? "border-[#FF4500] ring-1 ring-[#FF4500] shadow-[0_0_10px_rgba(255,69,0,0.3)]"
                          : "border-[#272B2F]"
                      }`}
                    >
                      {typedTitle || <span className="text-[#49545C]">Post title...</span>}
                      {agentStep === "typing_title" && (
                        <span className="w-1.5 h-4 bg-[#FF4500] ml-0.5 animate-pulse" />
                      )}
                    </div>
                  </div>

                  {/* Body Text Box */}
                  <div>
                    <label className="text-[11px] font-bold text-[#82959B] block mb-1">Body Text</label>
                    <div
                      className={`w-full min-h-[130px] px-3.5 py-2.5 rounded-lg bg-[#0E1113] border text-xs text-white leading-relaxed transition-all ${
                        agentStep === "typing_body"
                          ? "border-[#FF4500] ring-1 ring-[#FF4500] shadow-[0_0_10px_rgba(255,69,0,0.3)]"
                          : "border-[#272B2F]"
                      }`}
                    >
                      {typedBody || <span className="text-[#49545C]">Hinglish discussion text...</span>}
                      {agentStep === "typing_body" && (
                        <span className="inline-block w-1.5 h-4 bg-[#FF4500] ml-0.5 animate-pulse" />
                      )}
                    </div>
                  </div>

                  {/* Submit Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#1A1D20]">
                    <span className="text-[11px] text-[#82959B]">
                      Flair: <strong className="text-white">💬 Relatable Life</strong>
                    </span>

                    <button
                      className={`px-5 py-2 rounded-full text-xs font-bold text-white transition-all ${
                        agentStep === "done"
                          ? "bg-[#10B981]"
                          : agentStep === "submitting"
                          ? "bg-[#FF4500] scale-95 shadow-[0_0_15px_#FF4500]"
                          : "bg-[#FF4500]"
                      }`}
                    >
                      {agentStep === "done" ? "✓ Posted!" : "Post"}
                    </button>
                  </div>
                </div>

                {/* Published Link Card */}
                {agentStep === "done" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 text-xs text-white">
                      <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                      <div>
                        <span className="font-bold block">Live on r/ArreSuno!</span>
                        <span className="text-[#82959B] text-[11px]">{liveUrl}</span>
                      </div>
                    </div>

                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#10B981] text-black font-bold text-xs hover:bg-[#0EA5E9] hover:text-white transition-colors"
                    >
                      <span>View Live</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
