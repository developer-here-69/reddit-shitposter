import React, { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  ExternalLink,
  ShieldAlert,
  LogIn,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { RedditAuthStatus } from '../../../shared/types'

interface MacBrowserFrameProps {
  authStatus: RedditAuthStatus
  onNavigateSubmit: () => void
}

export const MacBrowserFrame: React.FC<MacBrowserFrameProps> = ({ authStatus, onNavigateSubmit }) => {
  const frameRef = useRef<HTMLDivElement>(null)
  const [currentUrl, setCurrentUrl] = useState('https://old.reddit.com/r/ArreSuno')
  const [urlInput, setUrlInput] = useState('https://old.reddit.com/r/ArreSuno')

  // Sync bounds of content area with WebContentsView
  useEffect(() => {
    const updateBounds = () => {
      if (!frameRef.current) return
      const rect = frameRef.current.getBoundingClientRect()
      window.api.syncBrowserBounds({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      })
    }

    updateBounds()
    window.addEventListener('resize', updateBounds)
    const interval = setInterval(updateBounds, 1000)

    // Listen to URL updates from main process
    const unsubscribe = window.api.onBrowserUrlChanged((url: string) => {
      setCurrentUrl(url)
      setUrlInput(url)
    })

    return () => {
      window.removeEventListener('resize', updateBounds)
      clearInterval(interval)
      unsubscribe()
    }
  }, [])

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    window.api.navigateBrowser(urlInput)
  }

  const handleGoLogin = () => {
    window.api.navigateBrowser('https://old.reddit.com/login')
  }

  const handleGoSubreddit = () => {
    window.api.navigateBrowser('https://old.reddit.com/r/ArreSuno')
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-3 gap-2">
      {/* 1. Mac-Style Window Frame Card */}
      <div className="flex-1 flex flex-col bg-[#14171A] border border-[#272B2F] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Title Bar with macOS Traffic Lights & Navigation */}
        <div className="h-11 bg-[#1A1D21] border-b border-[#2B2F35] px-3.5 flex items-center justify-between gap-3 select-none shrink-0">
          {/* macOS Window Traffic Lights */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoSubreddit}
              title="Reset to r/ArreSuno"
              className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] hover:opacity-80 transition-opacity flex items-center justify-center group cursor-pointer"
            >
              <span className="w-1.5 h-1.5 bg-black opacity-0 group-hover:opacity-100 rounded-full" />
            </button>
            <button
              title="Minimize"
              className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] hover:opacity-80 transition-opacity flex items-center justify-center group cursor-pointer"
            >
              <span className="w-1.5 h-0.5 bg-black opacity-0 group-hover:opacity-100 rounded" />
            </button>
            <button
              onClick={onNavigateSubmit}
              title="Open r/ArreSuno/submit"
              className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] hover:opacity-80 transition-opacity flex items-center justify-center group cursor-pointer"
            >
              <span className="w-1.5 h-1.5 bg-black opacity-0 group-hover:opacity-100 rounded-sm" />
            </button>
          </div>

          {/* Navigation Controls: Back, Forward, Reload */}
          <div className="flex items-center gap-1 text-[#82959B]">
            <button
              onClick={() => window.api.browserGoBack()}
              title="Back"
              className="p-1 hover:text-white hover:bg-[#25292E] rounded transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.api.browserGoForward()}
              title="Forward"
              className="p-1 hover:text-white hover:bg-[#25292E] rounded transition-colors cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.api.browserReload()}
              title="Reload Page"
              className="p-1 hover:text-white hover:bg-[#25292E] rounded transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Omnibox / URL Bar */}
          <form
            onSubmit={handleUrlSubmit}
            className="flex-1 max-w-xl flex items-center gap-2 bg-[#0E1113] hover:bg-[#080A0B] border border-[#272B2F] focus-within:border-[#FF4500] rounded-full px-3 py-1 text-xs transition-all shadow-inner"
          >
            <Lock className="w-3 h-3 text-[#10B981] shrink-0" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 bg-transparent text-white font-mono text-[11px] outline-none"
              placeholder="https://old.reddit.com/r/ArreSuno"
            />
            <button
              type="button"
              onClick={handleGoSubreddit}
              title="Jump to r/ArreSuno"
              className="text-[#82959B] hover:text-[#FF4500] cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          </form>

          {/* Subreddit Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FF4500]/15 border border-[#FF4500]/40 text-[#FF4500] text-[11px] font-bold">
            <span>r/ArreSuno</span>
          </div>
        </div>

        {/* 2. WebContentsView Container Area */}
        {/* Electron WebContentsView is positioned exactly over this div */}
        <div
          ref={frameRef}
          id="embedded-browser-viewport"
          className="flex-1 w-full bg-[#0E1113] relative overflow-hidden"
        />
      </div>

      {/* 3. Status Bar & Authentication Chip */}
      <div className="bg-[#12161A] border border-[#22262B] rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Status Indicator */}
          {authStatus.isLoggedIn ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] font-semibold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Logged in as <strong>u/{authStatus.username}</strong></span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAB308]/15 border border-[#EAB308]/40 text-[#EAB308] font-semibold text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Logged out</span>
            </div>
          )}

          {/* Log in Button if not authenticated */}
          {!authStatus.isLoggedIn && (
            <button
              onClick={handleGoLogin}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#FF4500] hover:bg-[#E03D00] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              <LogIn className="w-3 h-3" />
              <span>Log in to Reddit</span>
            </button>
          )}

          <button
            onClick={() => window.api.navigateBrowser('https://old.reddit.com/r/ArreSuno/submit')}
            className="text-[11px] text-[#82959B] hover:text-white underline cursor-pointer"
          >
            Go to Submit Page
          </button>
        </div>

        {/* Embedded Browser Note */}
        <div className="flex items-center gap-1.5 text-[11px] text-[#82959B] max-w-md text-right">
          <ShieldAlert className="w-3.5 h-3.5 text-[#82959B] shrink-0" />
          <span>Note: Google sign-in may be blocked in embedded browsers. Log in with Reddit username & password.</span>
        </div>
      </div>
    </div>
  )
}
