"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Minus,
  Square,
  X,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Lock,
  ExternalLink,
  Shield,
  CheckCircle2,
  Sparkles,
  Maximize2,
  Minimize2,
} from "lucide-react"

interface VirtualBrowserProps {
  isOpen: boolean
  onClose: () => void
  mode: "login" | "posting"
  profileName: string
  username: string
  targetUrl?: string
  postTitle?: string
  postBody?: string
  onComplete?: (url?: string) => void
}

export default function VirtualBrowserWindow({
  isOpen,
  onClose,
  mode,
  profileName,
  username,
  targetUrl = "https://www.reddit.com/r/ArreSuno/submit",
  postTitle = "",
  postBody = "",
  onComplete,
}: VirtualBrowserProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  // Simulation / Live Agent View States
  const [agentStep, setAgentStep] = useState<
    "navigating" | "typing_title" | "scrolling" | "typing_body" | "submitting" | "done"
  >("navigating")
  const [typedTitle, setTypedTitle] = useState("")
  const [typedBody, setTypedBody] = useState("")
  const [cursorPos, setCursorPos] = useState({ x: 250, y: 180 })
  const [liveUrl, setLiveUrl] = useState(targetUrl)

  useEffect(() => {
    if (!isOpen) return

    if (mode === "login") {
      setLiveUrl("https://www.reddit.com/login")
      return
    }

    // Reset for posting
    setAgentStep("navigating")
    setTypedTitle("")
    setTypedBody("")
    setLiveUrl(targetUrl)

    let isMounted = true

    const runAgentSimulation = async () => {
      // 1. Navigating
      setCursorPos({ x: 280, y: 220 })
      await new Promise((r) => setTimeout(r, 1200))
      if (!isMounted) return

      // 2. Move to Title box and type
      setAgentStep("typing_title")
      setCursorPos({ x: 340, y: 280 })
      await new Promise((r) => setTimeout(r, 600))

      const fullTitle = postTitle || "What is the unwritten rule of Indian households?"
      for (let i = 1; i <= fullTitle.length; i++) {
        if (!isMounted) return
        setTypedTitle(fullTitle.slice(0, i))
        await new Promise((r) => setTimeout(r, Math.random() * 45 + 30))
      }

      // 3. Scroll to Body
      await new Promise((r) => setTimeout(r, 600))
      if (!isMounted) return
      setAgentStep("scrolling")
      setCursorPos({ x: 420, y: 390 })

      // 4. Move to Body editor and type
      await new Promise((r) => setTimeout(r, 600))
      if (!isMounted) return
      setAgentStep("typing_body")

      const fullBody = postBody || "Arre suno, growing up we always had this classic rule..."
      for (let i = 1; i <= fullBody.length; i++) {
        if (!isMounted) return
        setTypedBody(fullBody.slice(0, i))
        await new Promise((r) => setTimeout(r, Math.random() * 30 + 15))
      }

      // 5. Scroll and move to Post button
      await new Promise((r) => setTimeout(r, 800))
      if (!isMounted) return
      setAgentStep("submitting")
      setCursorPos({ x: 620, y: 510 })

      // 6. Submit
      await new Promise((r) => setTimeout(r, 1200))
      if (!isMounted) return
      setAgentStep("done")
      const permalink = `https://www.reddit.com/r/ArreSuno/comments/live_${Date.now().toString(36)}/`
      setLiveUrl(permalink)
      if (onComplete) onComplete(permalink)
    }

    runAgentSimulation()

    return () => {
      isMounted = false
    }
  }, [isOpen, mode, postTitle, postBody, targetUrl])

  if (!isOpen) return null

  // If minimized, show taskbar floating pill
  if (isMinimized) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 px-4 py-2 bg-[#1A1D20] hover:bg-[#252A30] border border-[#FF4500] rounded-xl shadow-2xl cursor-pointer text-xs font-semibold text-white transition-all"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
        <img src="/reddit-logo.svg" alt="Reddit" className="w-4 h-4 shrink-0" />
        <span>Chrome — r/ArreSuno ({username})</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FF4500] text-white">Restore</span>
      </motion.div>
    )
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-3 sm:p-6">
        <motion.div
          drag
          dragMomentum={false}
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          className={`pointer-events-auto bg-[#1C1F23] border border-[#343A40] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden transition-all ${
            isMaximized
              ? "w-full h-full fixed inset-0 rounded-none z-50"
              : "w-full max-w-4xl h-[620px] max-h-[90vh]"
          }`}
        >
          {/* Windows 11 Chrome Titlebar */}
          <div className="bg-[#121518] px-3 pt-2 pb-1 border-b border-[#272B2F] flex items-center justify-between cursor-move select-none">
            {/* Chrome Tabs */}
            <div className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1C1F23] border-t border-x border-[#343A40] rounded-t-lg text-xs font-medium text-white max-w-xs shadow-sm">
                <img src="/reddit-logo.svg" alt="Reddit" className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {mode === "login"
                    ? `Reddit Login — (${username})`
                    : `r/ArreSuno: Submit — (${username})`}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] ml-auto shrink-0" />
              </div>
            </div>

            {/* Windows Window Controls (Minimize, Maximize, Close) */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                title="Minimize to Dock"
                className="w-8 h-7 flex items-center justify-center text-[#82959B] hover:text-white hover:bg-[#252A30] rounded transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? "Restore Window" : "Maximize Window"}
                className="w-8 h-7 flex items-center justify-center text-[#82959B] hover:text-white hover:bg-[#252A30] rounded transition-colors"
              >
                {isMaximized ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Square className="w-3 h-3" />
                )}
              </button>
              <button
                onClick={onClose}
                title="Close Window"
                className="w-8 h-7 flex items-center justify-center text-[#82959B] hover:text-white hover:bg-[#EF4444] rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chrome Navigation & Address Bar */}
          <div className="bg-[#1C1F23] px-3 py-2 border-b border-[#272B2F] flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[#82959B]">
              <button className="p-1 hover:text-white hover:bg-[#252A30] rounded">
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 hover:text-white hover:bg-[#252A30] rounded">
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 hover:text-white hover:bg-[#252A30] rounded">
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Omnibar / Address Input */}
            <div className="flex-1 flex items-center gap-2 bg-[#121518] border border-[#2B3036] rounded-full px-3 py-1 text-xs text-[#82959B]">
              <Lock className="w-3 h-3 text-[#10B981] shrink-0" />
              <span className="text-[#A0AEC0] select-all font-mono truncate">{liveUrl}</span>
            </div>

            {/* Profile Avatar & Agent Status */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#252A30] text-[#FF4500] border border-[#384048]">
                AGENT ACTIVE
              </span>
              <div className="w-6 h-6 rounded-full bg-[#FF4500] text-white flex items-center justify-center text-[10px] font-bold">
                u/
              </div>
            </div>
          </div>

          {/* Window Viewport (Inside the browser!) */}
          <div className="flex-1 bg-[#0E1113] relative overflow-hidden flex flex-col">
            {/* Antigravity Glowing Cursor Overlay */}
            {mode === "posting" && agentStep !== "done" && (
              <motion.div
                animate={{ x: cursorPos.x, y: cursorPos.y }}
                transition={{ type: "spring", damping: 28, stiffness: 180 }}
                className="absolute z-40 pointer-events-none"
              >
                <div className="w-5 h-5 rounded-full bg-[#FF4500] shadow-[0_0_15px_#FF4500,0_0_30px_rgba(255,69,0,0.6)] border-2 border-white flex items-center justify-center" />
                <span className="ml-4 mt-1 px-2 py-0.5 rounded bg-black/85 text-[10px] font-bold text-white border border-[#FF4500]/50 whitespace-nowrap block">
                  Antigravity Agent
                </span>
              </motion.div>
            )}

            {/* MODE 1: LOGIN MODE */}
            {mode === "login" && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full bg-[#1A1D20] border-2 border-[#FF4500] flex items-center justify-center mb-4 shadow-xl">
                  <img src="/reddit-logo.svg" alt="Reddit" className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-white">Log in as u/{username}</h3>
                <p className="text-xs text-[#82959B] mt-1.5 leading-relaxed">
                  A persistent Chrome profile has been created for{" "}
                  <span className="text-white font-mono font-semibold">{profileName}</span>. 
                  Log in on the real Chrome browser window. Your login session will be permanently linked inside this dashboard!
                </p>

                <div className="mt-6 p-4 rounded-xl bg-[#12161A] border border-[#272B2F] w-full text-left space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-[#10B981] font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Profile Data: backend/browser_profiles/{profileName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#82959B]">
                    <Shield className="w-4 h-4 text-[#FF4500]" />
                    <span>No passwords stored. Uses native secure Chrome cookies.</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-5 py-2 rounded-full bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
                  >
                    Done / Linked!
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-full bg-[#1A1D20] hover:bg-[#252A30] text-[#82959B] hover:text-white text-xs font-semibold border border-[#272B2F] cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* MODE 2: POSTING VIEW WITH LIVE AGENT ANIMATION */}
            {mode === "posting" && (
              <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Agent Action Banner */}
                <div className="bg-[#12161A] border border-[#272B2F] rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#FF4500] animate-spin" />
                    <span className="text-white font-bold">
                      {agentStep === "navigating" && "Navigating to r/ArreSuno/submit..."}
                      {agentStep === "typing_title" && "Agent typing post title..."}
                      {agentStep === "scrolling" && "Agent scrolling down to body..."}
                      {agentStep === "typing_body" && "Agent typing relatable Hinglish discussion..."}
                      {agentStep === "submitting" && "Agent moving cursor to Post button..."}
                      {agentStep === "done" && "🚀 Post submitted successfully to r/ArreSuno!"}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-[#82959B]">
                    Profile: {profileName} (u/{username})
                  </span>
                </div>

                {/* Simulated Reddit Submit Form in Browser */}
                <div className="bg-[#12161A] border border-[#1A1D20] rounded-xl p-4 sm:p-5 space-y-4 max-w-2xl mx-auto w-full shadow-lg">
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
                          ? "border-[#FF4500] shadow-[0_0_10px_rgba(255,69,0,0.3)] ring-1 ring-[#FF4500]"
                          : "border-[#272B2F]"
                      }`}
                    >
                      {typedTitle || (
                        <span className="text-[#49545C]">Title of your discussion...</span>
                      )}
                      {agentStep === "typing_title" && (
                        <span className="w-1.5 h-4 bg-[#FF4500] ml-0.5 animate-pulse" />
                      )}
                    </div>
                  </div>

                  {/* Body Text Box */}
                  <div>
                    <label className="text-[11px] font-bold text-[#82959B] block mb-1">Body Text</label>
                    <div
                      className={`w-full min-h-[140px] px-3.5 py-2.5 rounded-lg bg-[#0E1113] border text-xs text-white leading-relaxed transition-all ${
                        agentStep === "typing_body"
                          ? "border-[#FF4500] shadow-[0_0_10px_rgba(255,69,0,0.3)] ring-1 ring-[#FF4500]"
                          : "border-[#272B2F]"
                      }`}
                    >
                      {typedBody || (
                        <span className="text-[#49545C]">Text (optional, relatable Hinglish conversation)...</span>
                      )}
                      {agentStep === "typing_body" && (
                        <span className="inline-block w-1.5 h-4 bg-[#FF4500] ml-0.5 animate-pulse" />
                      )}
                    </div>
                  </div>

                  {/* Post Submit Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#1A1D20]">
                    <span className="text-[11px] text-[#82959B]">
                      Flairs: <span className="text-white font-semibold">💬 Relatable Life</span>
                    </span>

                    <button
                      className={`px-5 py-2 rounded-full text-xs font-bold text-white transition-all ${
                        agentStep === "done"
                          ? "bg-[#10B981]"
                          : agentStep === "submitting"
                          ? "bg-[#FF4500] scale-95 shadow-[0_0_15px_#FF4500]"
                          : "bg-[#FF4500] opacity-90"
                      }`}
                    >
                      {agentStep === "done" ? "✓ Posted!" : "Post"}
                    </button>
                  </div>
                </div>

                {/* Success Card when completed */}
                {agentStep === "done" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 flex items-center justify-between max-w-2xl mx-auto w-full"
                  >
                    <div className="flex items-center gap-2.5 text-xs text-white">
                      <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                      <div>
                        <span className="font-bold block">Live on Reddit!</span>
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
