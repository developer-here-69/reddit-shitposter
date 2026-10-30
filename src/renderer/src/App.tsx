import React, { useState, useEffect } from 'react'
import {
  Settings,
  Sparkles,
  RefreshCw,
  Clock,
  Shield,
  ExternalLink,
  Flame,
} from 'lucide-react'
import { Post, RedditAuthStatus, AgentState, AgentStep, LimitCheckResult } from '../../shared/types'
import { MacBrowserFrame } from './components/MacBrowserFrame'
import { PostQueue } from './components/PostQueue'
import { GeneratorPanel } from './components/GeneratorPanel'
import { AgentControlBar } from './components/AgentControlBar'
import { ConfirmPostModal } from './components/ConfirmPostModal'
import { PostEditorModal } from './components/PostEditorModal'
import { SettingsModal } from './components/SettingsModal'

export const App: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([])
  const [authStatus, setAuthStatus] = useState<RedditAuthStatus>({
    isLoggedIn: false,
    checkedAt: Date.now(),
  })
  const [hasStoredKey, setHasStoredKey] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null)
  const [confirmPost, setConfirmPost] = useState<Post | null>(null)
  const [confirmLimitCheck, setConfirmLimitCheck] = useState<LimitCheckResult | null>(null)

  // Agent State
  const [agentState, setAgentState] = useState<AgentState>({
    isRunning: false,
    isPaused: false,
    speed: 1,
    steps: [],
  })

  // Load posts & initial state on mount
  useEffect(() => {
    loadData()

    // Listen to push events from main process
    const unAuth = window.api.onBrowserAuthChanged((status: RedditAuthStatus) => {
      setAuthStatus(status)
    })

    const unStep = window.api.onAgentStepUpdate((step: AgentStep) => {
      setAgentState((prev) => {
        const existingIdx = prev.steps.findIndex((s) => s.id === step.id)
        const updatedSteps = [...prev.steps]
        if (existingIdx >= 0) {
          updatedSteps[existingIdx] = step
        } else {
          updatedSteps.push(step)
        }
        return {
          ...prev,
          steps: updatedSteps,
        }
      })
    })

    const unSched = window.api.onPromptApproval((post: Post) => {
      triggerApprovalFlow(post)
    })

    return () => {
      unAuth()
      unStep()
      unSched()
    }
  }, [])

  const loadData = async () => {
    try {
      const [fetchedPosts, settings] = await Promise.all([
        window.api.getPosts(),
        window.api.getSettings(),
      ])
      setPosts(fetchedPosts)
      setHasStoredKey(settings.hasStoredKey)
      setAgentState((prev) => ({ ...prev, speed: settings.agentSpeed || 1 }))
    } catch (err) {
      console.error('Failed to load initial data:', err)
    }
  }

  // Trigger Mandatory User Approval Dialog before posting
  const triggerApprovalFlow = async (post: Post) => {
    try {
      const limitCheck = await window.api.checkLimits(post)
      setConfirmLimitCheck(limitCheck)
      setConfirmPost(post)
    } catch (err) {
      console.error('Limit check failed:', err)
      setConfirmPost(post)
    }
  }

  const handleStartAgentApproved = async (post: Post) => {
    setConfirmPost(null)
    setAgentState((prev) => ({
      ...prev,
      isRunning: true,
      currentPostId: post.id,
      steps: [],
    }))

    try {
      const res = await window.api.startAgent(post)
      await loadData()
      if (!res.success) {
        console.error('Agent finished with failure:', res.error)
      }
    } catch (err: any) {
      console.error('Agent execution exception:', err)
      await loadData()
    } finally {
      setAgentState((prev) => ({
        ...prev,
        isRunning: false,
        currentPostId: undefined,
      }))
    }
  }

  const handleStopAgent = async () => {
    await window.api.stopAgent()
    setAgentState((prev) => ({
      ...prev,
      isRunning: false,
    }))
  }

  const handleSpeedChange = async (speed: number) => {
    setAgentState((prev) => ({ ...prev, speed }))
    await window.api.setAgentSpeed(speed)
  }

  // Post next approved in queue
  const handlePostNext = () => {
    const nextApproved = posts.find((p) => p.status === 'approved') || posts.find((p) => p.status !== 'posted')
    if (nextApproved) {
      triggerApprovalFlow(nextApproved)
    }
  }

  // Shuffle queue with Fisher-Yates
  const handleShuffleQueue = async () => {
    const queued = posts.filter((p) => p.status !== 'posted')
    if (queued.length <= 1) return

    const shuffled = [...queued]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const nonQueued = posts.filter((p) => p.status === 'posted')
    const combined = [...shuffled, ...nonQueued].map((p, idx) => ({ ...p, order: idx + 1 }))

    setPosts(combined)
    await window.api.reorderPosts(combined)
  }

  return (
    <div className="flex h-screen w-screen bg-[#0E1113] text-[#D7DADC] overflow-hidden select-none font-sans">
      {/* ============================================================ */}
      {/* LEFT PANEL (~35% WIDTH): POST QUEUE & GENERATOR               */}
      {/* ============================================================ */}
      <div className="w-[38%] min-w-[360px] max-w-[480px] h-full flex flex-col bg-[#0E1113] border-r border-[#1F2327] overflow-hidden">
        {/* App Header */}
        <header className="h-12 bg-[#0E1113] border-b border-[#1F2327] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#FF4500] flex items-center justify-center text-white font-extrabold text-sm shadow-md">
              r/
            </div>
            <div>
              <span className="font-extrabold text-white text-sm tracking-tight block">
                ArreSuno Poster
              </span>
              <span className="text-[10px] text-[#82959B]">Personal Subreddit Engine</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSettingsOpen(true)}
              title="Settings & SafeStorage"
              className="p-1.5 hover:text-white text-[#82959B] hover:bg-[#1A1D20] rounded-lg transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Left Column Body */}
        <div className="flex-1 flex flex-col p-3.5 space-y-3.5 overflow-y-auto">
          {/* Generator Card */}
          <GeneratorPanel
            hasKey={hasStoredKey}
            onOpenSettings={() => setSettingsOpen(true)}
            onPostGenerated={(newPost) => setPosts((prev) => [newPost, ...prev])}
          />

          {/* Post Queue with dnd-kit Reorder */}
          <PostQueue
            posts={posts}
            onReorder={async (reordered) => {
              setPosts(reordered)
              await window.api.reorderPosts(reordered)
            }}
            onShuffle={handleShuffleQueue}
            onEdit={(p) => setEditingPost(p)}
            onDelete={async (id) => {
              setPosts((prev) => prev.filter((p) => p.id !== id))
              await window.api.deletePost(id)
            }}
            onPostThis={(p) => triggerApprovalFlow(p)}
            onPostNext={handlePostNext}
            onNewDraft={() =>
              setEditingPost({
                title: '',
                body: '',
                flair: '💬 Relatable Life',
                status: 'draft',
              })
            }
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT PANEL (~65% WIDTH): MAC BROWSER FRAME & AGENT LOG       */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col h-full bg-[#0A0C0E] overflow-hidden">
        {/* Mac-Style Embedded Browser Window */}
        <MacBrowserFrame
          authStatus={authStatus}
          onNavigateSubmit={() =>
            window.api.navigateBrowser('https://old.reddit.com/r/ArreSuno/submit')
          }
        />

        {/* Live Agent Control & Step Log Bar */}
        <div className="px-3 pb-3 shrink-0">
          <AgentControlBar
            agentState={agentState}
            onStop={handleStopAgent}
            onSpeedChange={handleSpeedChange}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODALS                                                        */}
      {/* ============================================================ */}
      {/* Mandatory User Confirm Dialog */}
      <ConfirmPostModal
        post={confirmPost}
        limitCheck={confirmLimitCheck}
        onClose={() => setConfirmPost(null)}
        onApprove={handleStartAgentApproved}
      />

      {/* Post Editor / Creator */}
      <PostEditorModal
        post={editingPost}
        onClose={() => setEditingPost(null)}
        onSave={async (saved) => {
          setEditingPost(null)
          await window.api.savePost(saved)
          await loadData()
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => {
          setSettingsOpen(false)
          loadData()
        }}
      />
    </div>
  )
}
