"use client"

import React, { useState, useEffect } from "react"
import { motion, Reorder, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  Shuffle,
  Plus,
  Send,
  Edit3,
  Trash2,
  Clock,
  GripVertical,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Play,
  Pause,
  MessageSquare,
  Share2,
  Bookmark,
  MoreHorizontal,
  Flame,
  Search,
  Check,
  X,
  Shield,
  User,
  RefreshCw,
  Bell,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  Info,
  ChevronDown,
} from "lucide-react"
import { RedditAccount, QueuePost, PostCategory } from "@/lib/types"

// Real Reddit Logo
function RedditLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <img
      src="/reddit-logo.svg"
      alt="Reddit"
      className={`shrink-0 ${className}`}
    />
  )
}

// Real Subreddit r/ArreSuno Avatar
function SubredditIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <img
      src="/arresuno-icon.png"
      alt="r/ArreSuno"
      className={`rounded-full object-cover shrink-0 border border-[#272B2F] ${className}`}
    />
  )
}

const CATEGORY_FLAIRS: Record<PostCategory, { label: string; bg: string; text: string }> = {
  relatable_life: { label: "💬 Relatable Life", bg: "#1F2833", text: "#66FCF1" },
  question: { label: "❓ Sawaal-Jawaab", bg: "#2E2836", text: "#DDA0DD" },
  harmless_confession: { label: "🤫 Harmless Confession", bg: "#362E25", text: "#FFB86C" },
  casual_rant: { label: "☕ Chai Tapri Rant", bg: "#332222", text: "#FF6B6B" },
}

export default function RedditFeedDashboard() {
  const [subreddit, setSubreddit] = useState("ArreSuno")
  const [accounts, setAccounts] = useState<RedditAccount[]>([])
  const [posts, setPosts] = useState<QueuePost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"queue" | "history">("queue")
  const [generating, setGenerating] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Edit modal
  const [editingPost, setEditingPost] = useState<QueuePost | null>(null)

  // Account modal
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Partial<RedditAccount> | null>(null)
  const [browserPostingId, setBrowserPostingId] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [resPosts, resAccounts] = await Promise.all([
        fetch("/api/posts").then((r) => r.json()),
        fetch("/api/accounts").then((r) => r.json()),
      ])
      if (resPosts.posts) setPosts(resPosts.posts)
      if (resPosts.subreddit) setSubreddit(resPosts.subreddit)
      if (resAccounts.accounts) setAccounts(resAccounts.accounts)
    } catch (err) {
      console.error(err)
      showToast("Error connecting to server")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Mouse Drag-and-Drop Reorder with Framer Motion
  const handleReorder = async (newOrderQueued: QueuePost[]) => {
    newOrderQueued.forEach((p, idx) => (p.order = idx + 1))
    const nonQueued = posts.filter((p) => p.status !== "queued")
    const combined = [...newOrderQueued, ...nonQueued]
    setPosts(combined)

    try {
      await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", posts: combined }),
      })
    } catch (err) {
      console.error(err)
    }
  }

  // Shuffle queue with mouse click
  const handleShuffle = async () => {
    const queued = posts.filter((p) => p.status === "queued")
    if (queued.length <= 1) {
      showToast("Add at least 2 posts to shuffle the queue!")
      return
    }

    const shuffled = [...queued]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    shuffled.forEach((p, idx) => (p.order = idx + 1))

    const nonQueued = posts.filter((p) => p.status !== "queued")
    const combined = [...shuffled, ...nonQueued]
    setPosts(combined)

    await fetch("/api/posts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", posts: combined }),
    })
    showToast("🔀 Queue shuffled randomly!")
  }

  // Generate new post with Gemini
  const handleGenerate = async (category: PostCategory = "relatable_life") => {
    try {
      setGenerating(true)
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      })
      const data = await res.json()
      if (data.success && data.post) {
        setPosts((prev) => [...prev, data.post])
        showToast("✨ Fresh Hinglish post generated & added to queue!")
      } else {
        showToast(data.error || "Generation failed")
      }
    } catch (err: any) {
      showToast("Error generating post: " + err.message)
    } finally {
      setGenerating(false)
    }
  }

  // Delete post
  const handleDeletePost = async (id: string) => {
    if (!confirm("Remove this post from queue?")) return
    try {
      const res = await fetch(`/api/posts?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id))
        showToast("Post removed from queue")
      }
    } catch {
      showToast("Error deleting post")
    }
  }

  // Save edited post
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPost) return

    try {
      const res = await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPost),
      })
      const data = await res.json()
      if (data.success) {
        setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? data.post : p)))
        setEditingPost(null)
        showToast("Post updated successfully")
      }
    } catch {
      showToast("Failed to update post")
    }
  }

  // Save account
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAccount) return

    try {
      const isNew = !editingAccount.id
      const url = "/api/accounts"
      const method = isNew ? "POST" : "PUT"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingAccount),
      })
      const data = await res.json()
      if (data.success) {
        if (isNew) {
          setAccounts((prev) => [...prev, data.account])
          showToast(`Account u/${data.account.username} added!`)
        } else {
          setAccounts((prev) => prev.map((a) => (a.id === data.account.id ? data.account : a)))
          showToast(`Account u/${data.account.username} updated!`)
        }
        setAccountModalOpen(false)
        setEditingAccount(null)
      } else {
        showToast(data.error || "Failed to save account")
      }
    } catch {
      showToast("Error saving account")
    }
  }

  // Toggle account active/paused
  const handleToggleAccount = async (account: RedditAccount) => {
    try {
      const updated = { ...account, isActive: !account.isActive }
      const res = await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      })
      const data = await res.json()
      if (data.success) {
        setAccounts((prev) => prev.map((a) => (a.id === account.id ? data.account : a)))
        showToast(`u/${account.username} is now ${data.account.isActive ? "Active" : "Paused"}`)
      }
    } catch {
      showToast("Error updating account")
    }
  }

  // Delete account
  const handleDeleteAccount = async (id: string) => {
    if (accounts.length <= 1) {
      showToast("You must keep at least 1 account in rotation!")
      return
    }
    if (!confirm("Delete this Reddit account from rotation?")) return
    try {
      const res = await fetch(`/api/accounts?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== id))
        showToast("Account removed")
      }
    } catch {
      showToast("Error removing account")
    }
  }

  // Publish immediate
  const handlePublishNow = async (postId: string) => {
    try {
      showToast("Submitting post to r/" + subreddit + "...")
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      })
      const data = await res.json()
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, status: "posted", redditUrl: data.url } : p))
        )
        showToast("🚀 Successfully posted to r/" + subreddit)
      } else if (data.requiresCredentials) {
        showToast(data.message)
      } else {
        showToast(data.error || "Posting failed")
      }
    } catch {
      showToast("Error executing post")
    }
  }

  // Antigravity-style Browser Agent Poster
  const handlePublishBrowser = async (postId: string) => {
    try {
      setBrowserPostingId(postId)
      showToast("🚀 Launching Antigravity browser agent... Watch Chrome open on your screen!")
      const res = await fetch("/api/browser-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, profileName: "account_1", headless: false }),
      })
      const data = await res.json()
      if (data.success && data.url) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, status: "posted", redditUrl: data.url } : p))
        )
        showToast("🎉 Successfully posted to r/ArreSuno via Browser Agent!")
      } else {
        showToast(data.error || "Browser post failed")
      }
    } catch {
      showToast("Error launching browser agent")
    } finally {
      setBrowserPostingId(null)
    }
  }

  // Open Chrome login window for a profile
  const handleOpenChromeLogin = async (acc: RedditAccount) => {
    try {
      const numMatch = acc.id.match(/\d+/)
      const profileName = `account_${numMatch ? numMatch[0] : "1"}`
      showToast(`🌐 Opening Chrome profile for u/${acc.username}...`)
      const res = await fetch("/api/browser-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileName }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(`Chrome opened! Log in as u/${acc.username} and press ENTER.`)
      }
    } catch {
      showToast("Error launching Chrome login")
    }
  }

  const queuedPosts = posts
    .filter((p) => p.status === "queued")
    .filter(
      (p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.body.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.order - b.order)

  const historyPosts = posts.filter((p) => p.status !== "queued")

  return (
    <div className="min-h-screen bg-[#0E1113] text-[#D7DADC] font-sans">
      {/* Toast */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-[#1A1D20] border border-[#343A40] text-white rounded-full shadow-2xl text-xs font-semibold"
        >
          <div className="w-2 h-2 rounded-full bg-[#FF4500]" />
          <span>{toastMessage}</span>
        </motion.div>
      )}

      {/* Official Reddit Top Header */}
      <header className="sticky top-0 z-40 bg-[#0E1113] border-b border-[#1A1D20] px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Real Reddit Logo */}
          <div className="flex items-center gap-2 cursor-pointer">
            <RedditLogo className="w-8 h-8" />
            <span className="font-extrabold text-lg text-white tracking-tighter hidden sm:inline">
              reddit
            </span>
          </div>

          {/* Subreddit Switcher Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1A1D20] hover:bg-[#252A30] border border-[#272B2F] cursor-pointer text-xs font-semibold text-white transition-colors">
            <SubredditIcon className="w-5 h-5 text-[10px]" />
            <span>r/{subreddit}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#82959B]" />
          </div>
        </div>

        {/* Center Reddit Pill Search Bar */}
        <div className="hidden md:flex items-center gap-2 bg-[#1A1D20] hover:bg-[#22272B] border border-[#272B2F] rounded-full px-3.5 py-1.5 w-96 text-xs transition-colors">
          <Search className="w-4 h-4 text-[#82959B]" />
          <input
            type="text"
            placeholder={`Search posts in r/${subreddit}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-white focus:outline-none w-full text-xs placeholder:text-[#82959B]"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Shuffle Button */}
          <button
            onClick={handleShuffle}
            title="Randomly shuffle the queue order"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1A1D20] hover:bg-[#272B2F] text-white text-xs font-bold border border-[#272B2F] cursor-pointer transition-colors shadow-sm"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#FF4500]" />
            <span className="hidden sm:inline">Shuffle</span>
          </button>

          {/* AI Draft Button */}
          <button
            onClick={() => handleGenerate("relatable_life")}
            disabled={generating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-bold cursor-pointer transition-colors shadow-sm disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
            <span>{generating ? "Drafting..." : "Generate Post"}</span>
          </button>

          {/* User profile pill */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#22272B]">
            <div className="w-7 h-7 rounded-full bg-[#272B2F] border border-[#343A40] flex items-center justify-center text-xs font-bold text-[#FF4500]">
              u/
            </div>
            <span className="text-xs font-semibold text-white hidden lg:inline">
              {accounts[0]?.username || "mere_se_nhi_hota"}
            </span>
          </div>
        </div>
      </header>

      {/* Subreddit Banner Header — Real r/ArreSuno Banner & Avatar */}
      <div className="bg-[#12161A] border-b border-[#1A1D20]">
        {/* Real r/ArreSuno Panoramic Chai Tapri Banner */}
        <div className="h-36 sm:h-48 md:h-56 w-full relative overflow-hidden bg-[#1A1D20]">
          <img
            src="/arresuno-banner.png"
            alt="r/ArreSuno Official Community Banner"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12161A] via-transparent to-black/20 pointer-events-none" />
        </div>

        {/* Subreddit Identity Bar */}
        <div className="max-w-5xl mx-auto px-4 pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-3 relative -mt-10 sm:-mt-14">
          <div className="flex items-end gap-3.5">
            {/* Real r/ArreSuno Community Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#0E1113] p-1 border-4 border-[#0E1113] shadow-2xl shrink-0 relative z-10 overflow-hidden">
              <img
                src="/arresuno-icon.png"
                alt="r/ArreSuno"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-2xl text-white tracking-tight">r/{subreddit}</h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#252A30] text-[#FF4500] border border-[#343A40]">
                  MOD STUDIO
                </span>
              </div>
              <p className="text-xs text-[#82959B] mt-0.5">
                r/{subreddit} • Hinglish-first community for Indians to share real stories & relatable discussions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pb-1">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#1A1D20] border border-[#272B2F] text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>{queuedPosts.length} in Queue</span>
            </span>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#1A1D20] border border-[#272B2F] text-white flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#24A0ED]" />
              <span>{accounts.length} Poster Accounts</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Reddit Layout */}
      <div className="max-w-5xl mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Post Feed & Queue (8 cols) */}
        <main className="lg:col-span-8 space-y-4">
          {/* Reddit Create Post Card */}
          <div className="bg-[#12161A] border border-[#1A1D20] rounded-xl p-3 flex items-center gap-3">
            <SubredditIcon className="w-8 h-8" />
            <input
              type="text"
              readOnly
              onClick={() => handleGenerate("relatable_life")}
              placeholder="Draft a new discussion post with AI for r/ArreSuno..."
              className="bg-[#1A1D20] hover:bg-[#252A30] border border-[#272B2F] rounded-full px-4 py-2 text-xs text-[#82959B] hover:text-white cursor-pointer w-full transition-colors"
            />
            <button
              onClick={() => handleGenerate("relatable_life")}
              disabled={generating}
              className="p-2 rounded-full bg-[#1A1D20] hover:bg-[#252A30] border border-[#272B2F] text-[#FF4500] cursor-pointer"
              title="Generate with Gemini"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>

          {/* Feed Filter Sort Bar (Hot / Queued / History / Shuffle) */}
          <div className="bg-[#12161A] border border-[#1A1D20] rounded-xl p-2.5 flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("queue")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  activeTab === "queue"
                    ? "bg-[#252A30] text-white"
                    : "text-[#82959B] hover:bg-[#1A1D20] hover:text-white"
                }`}
              >
                <Flame className="w-4 h-4 text-[#FF4500]" />
                <span>Hot Queue ({queuedPosts.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  activeTab === "history"
                    ? "bg-[#252A30] text-white"
                    : "text-[#82959B] hover:bg-[#1A1D20] hover:text-white"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <span>Posted Archive ({historyPosts.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#556066] hidden sm:inline">
                Drag cards with mouse to reorder
              </span>
              <button
                onClick={handleShuffle}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1A1D20] hover:bg-[#252A30] border border-[#272B2F] text-white cursor-pointer"
                title="Shuffle queue"
              >
                <Shuffle className="w-3.5 h-3.5 text-[#FF4500]" />
                <span>Shuffle</span>
              </button>
            </div>
          </div>

          {/* Feed Posts */}
          {activeTab === "queue" && (
            <div>
              {queuedPosts.length === 0 ? (
                <div className="text-center py-16 bg-[#12161A] border border-dashed border-[#1A1D20] rounded-xl">
                  <Clock className="w-10 h-10 text-[#49545C] mx-auto mb-2" />
                  <p className="font-bold text-white text-sm">No scheduled posts in queue</p>
                  <p className="text-xs text-[#82959B] mt-1 mb-4">
                    Click Generate to draft your next Hinglish discussion post.
                  </p>
                  <button
                    onClick={() => handleGenerate("relatable_life")}
                    disabled={generating}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-bold cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Discussion</span>
                  </button>
                </div>
              ) : (
                /* Framer Motion Reorder.Group for smooth mouse drag & drop! */
                <Reorder.Group
                  axis="y"
                  values={queuedPosts}
                  onReorder={handleReorder}
                  className="space-y-3"
                >
                  {queuedPosts.map((post, idx) => {
                    const assignedAcc = accounts.find((a) => a.id === post.accountId)
                    const flair = CATEGORY_FLAIRS[post.category] || CATEGORY_FLAIRS.relatable_life
                    return (
                      <Reorder.Item
                        key={post.id}
                        value={post}
                        whileDrag={{
                          scale: 1.015,
                          boxShadow: "0 12px 30px rgba(0,0,0,0.8)",
                          cursor: "grabbing",
                        }}
                        className="bg-[#12161A] hover:bg-[#15191E] border border-[#1A1D20] hover:border-[#272B2F] rounded-xl p-3.5 transition-colors cursor-default select-none group"
                      >
                        {/* Post Header */}
                        <div className="flex items-center justify-between text-xs text-[#82959B] mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <SubredditIcon className="w-5 h-5 text-[9px]" />
                            <span className="font-bold text-white hover:underline cursor-pointer">
                              r/{subreddit}
                            </span>
                            <span>•</span>
                            <span>Posted by</span>
                            <span
                              className="font-semibold px-2 py-0.5 rounded-full text-[11px]"
                              style={{
                                backgroundColor: `${assignedAcc?.color || "#FF4500"}20`,
                                color: assignedAcc?.color || "#FF4500",
                              }}
                            >
                              u/{assignedAcc?.username || "unassigned"}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-[#82959B] font-mono">
                              <Clock className="w-3 h-3 text-[#FF4500]" />
                              Scheduled:{" "}
                              {new Date(post.scheduledAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {/* Grip Handle for Mouse Drag Reordering */}
                          <div
                            className="flex items-center gap-1 text-[#556066] group-hover:text-white cursor-grab active:cursor-grabbing px-2 py-0.5 rounded bg-[#0E1113] border border-[#1A1D20]"
                            title="Click and drag with mouse to reorder queue"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                            <span className="font-mono font-bold text-[10px]">#{idx + 1}</span>
                          </div>
                        </div>

                        {/* Post Flair */}
                        <div className="mb-2">
                          <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded-full border border-white/10"
                            style={{ backgroundColor: flair.bg, color: flair.text }}
                          >
                            {flair.label}
                          </span>
                        </div>

                        {/* Post Title */}
                        <h2 className="text-base font-bold text-white mb-2 leading-snug">
                          {post.title}
                        </h2>

                        {/* Post Body (Exact Reddit Self-text style) */}
                        <p className="text-xs text-[#C8D1D7] leading-relaxed whitespace-pre-wrap mb-3.5 font-normal">
                          {post.body}
                        </p>

                        {/* Reddit Action Bar */}
                        <div className="flex items-center justify-between border-t border-[#1A1D20] pt-2.5 text-xs text-[#82959B]">
                          <div className="flex items-center gap-2">
                            {/* Vote Pill */}
                            <div className="flex items-center bg-[#1A1D20] rounded-full px-2.5 py-1 gap-1.5 font-bold text-white border border-[#272B2F]">
                              <ArrowUp className="w-3.5 h-3.5 text-[#FF4500]" />
                              <span className="text-[11px]">Queue #{idx + 1}</span>
                              <ArrowDown className="w-3.5 h-3.5 text-[#82959B]" />
                            </div>

                            {/* Edit Button */}
                            <button
                              onClick={() => setEditingPost(post)}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A1D20] hover:bg-[#252A30] text-[#82959B] hover:text-white font-semibold cursor-pointer border border-[#272B2F]"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="p-1.5 rounded-full bg-[#1A1D20] hover:bg-[#2E181B] text-[#82959B] hover:text-[#EF4444] cursor-pointer border border-[#272B2F]"
                              title="Delete from queue"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Post Actions: Browser Agent & API */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePublishBrowser(post.id)}
                              disabled={browserPostingId === post.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1A1D20] hover:bg-[#252A30] text-[#FF4500] hover:text-[#FF6A33] border border-[#FF4500]/50 font-bold cursor-pointer shadow-sm text-xs transition-colors"
                              title="Watch Antigravity-style agent open Chrome, move cursor, and post live!"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>{browserPostingId === post.id ? "Agent Posting..." : "Post via Browser Agent 🖱️"}</span>
                            </button>

                            <button
                              onClick={() => handlePublishNow(post.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF4500] hover:bg-[#E03D00] text-white font-bold cursor-pointer shadow-sm text-xs"
                            >
                              <Send className="w-3 h-3" />
                              <span>Post (API)</span>
                            </button>
                          </div>
                        </div>
                      </Reorder.Item>
                    )
                  })}
                </Reorder.Group>
              )}
            </div>
          )}

          {/* Archive / History */}
          {activeTab === "history" && (
            <div className="space-y-3">
              {historyPosts.length === 0 ? (
                <div className="text-center py-16 bg-[#12161A] border border-[#1A1D20] rounded-xl text-xs text-[#82959B]">
                  No posts published yet. Once a post is published, it appears here with its live Reddit permalink.
                </div>
              ) : (
                historyPosts.map((post) => {
                  const assignedAcc = accounts.find((a) => a.id === post.accountId)
                  return (
                    <div
                      key={post.id}
                      className="p-3.5 rounded-xl bg-[#12161A] border border-[#1A1D20] flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                          <span className="font-bold text-sm text-white">{post.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#82959B]">
                          <span>by u/{assignedAcc?.username || "unknown"}</span>
                          <span>•</span>
                          <span>{new Date(post.postedAt || post.scheduledAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {post.redditUrl && (
                        <a
                          href={post.redditUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A1D20] text-xs font-semibold text-[#24A0ED] hover:text-white border border-[#272B2F]"
                        >
                          <span>View on Reddit</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </main>

        {/* Right Sidebar Column (4 cols) — Authentic Reddit Sidebar Widgets */}
        <aside className="lg:col-span-4 space-y-4">
          {/* "About Community" Widget with Real Banner & Avatar */}
          <div className="bg-[#12161A] border border-[#1A1D20] rounded-xl overflow-hidden">
            {/* Mini Community Banner */}
            <div className="h-16 relative overflow-hidden bg-[#1A1D20]">
              <img
                src="/arresuno-banner.png"
                alt="r/ArreSuno"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#12161A] via-transparent to-black/30 pointer-events-none" />
            </div>

            <div className="p-3.5 space-y-3 -mt-6 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src="/arresuno-icon.png"
                    alt="r/ArreSuno"
                    className="w-9 h-9 rounded-full border-2 border-[#12161A] object-cover shrink-0 shadow-md"
                  />
                  <div>
                    <span className="font-bold text-white text-xs block">r/ArreSuno</span>
                    <span className="text-[10px] text-[#82959B]">Community Info</span>
                  </div>
                </div>
                <Shield className="w-4 h-4 text-[#FF4500]" />
              </div>

              <p className="text-xs text-[#C8D1D7] leading-relaxed">
                ArreSuno is a Hinglish-first community for Indians to share real stories, ask interesting questions, confess harmless things, and discuss everyday relatable experiences.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1A1D20] text-xs">
                <div>
                  <span className="font-bold text-white block">{queuedPosts.length}</span>
                  <span className="text-[11px] text-[#82959B]">Queued Posts</span>
                </div>
                <div>
                  <span className="font-bold text-white block">{accounts.length}</span>
                  <span className="text-[11px] text-[#82959B]">Poster Accounts</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1A1D20] flex items-center justify-between text-xs">
                <span className="text-[#82959B]">Auto-post schedule:</span>
                <span className="font-semibold text-[#10B981]">3x Daily (IST)</span>
              </div>
            </div>
          </div>

          {/* "Rotating Poster Accounts" Widget */}
          <div className="bg-[#12161A] border border-[#1A1D20] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#82959B]">
                Poster Accounts Rotation
              </span>
              <button
                onClick={() => {
                  setEditingAccount({
                    username: "",
                    clientId: "",
                    clientSecret: "",
                    password: "",
                    dailyLimit: 2,
                  })
                  setAccountModalOpen(true)
                }}
                className="text-xs text-[#FF4500] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-2">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`p-2.5 rounded-lg border text-xs transition-colors ${
                    acc.isActive
                      ? "bg-[#181D22] border-[#22272B]"
                      : "bg-[#121518] border-[#1A1D20] opacity-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: acc.color || "#FF4500" }}
                      />
                      <span className="font-bold text-white">u/{acc.username}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleAccount(acc)}
                        title={acc.isActive ? "Pause account" : "Activate account"}
                        className={`p-1 rounded cursor-pointer ${
                          acc.isActive ? "text-[#10B981]" : "text-[#82959B]"
                        }`}
                      >
                        {acc.isActive ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingAccount(acc)
                          setAccountModalOpen(true)
                        }}
                        className="p-1 rounded text-[#82959B] hover:text-white cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      {accounts.length > 1 && (
                        <button
                          onClick={() => handleDeleteAccount(acc.id)}
                          className="p-1 rounded text-[#82959B] hover:text-[#EF4444] cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#82959B] mt-1.5 pt-1.5 border-t border-[#1F2428]">
                    <span>Quota: {acc.postedToday}/{acc.dailyLimit} posted</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenChromeLogin(acc)}
                        className="text-[#38BDF8] hover:underline font-semibold cursor-pointer"
                        title="Open Chrome to log in once"
                      >
                        Log in Chrome 🌐
                      </button>
                      <span className={acc.clientId ? "text-[#10B981] font-mono" : "text-[#EAB308]"}>
                        {acc.clientId ? "Ready" : "Auth Needed"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Subreddit Rules Box */}
          <div className="bg-[#12161A] border border-[#1A1D20] rounded-xl p-3.5 space-y-2 text-xs">
            <span className="font-bold text-white uppercase text-[11px] tracking-wider text-[#82959B]">
              r/{subreddit} Posting Rules
            </span>
            <ul className="space-y-1.5 text-[11px] text-[#82959B] list-disc list-inside">
              <li>Keep conversations genuine, respectful & non-political.</li>
              <li>Natural Hinglish & English mix.</li>
              <li>Zero spam, affiliate links, or promo.</li>
              <li>End posts with an open, relatable question.</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Edit Post Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161A] border border-[#272B2F] rounded-2xl w-full max-w-xl p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A1D20] mb-3.5">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#FF4500]" />
                <span>Edit Queued Post</span>
              </h3>
              <button
                onClick={() => setEditingPost(null)}
                className="p-1 rounded text-[#82959B] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePost} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#82959B] mb-1">Title</label>
                <input
                  type="text"
                  value={editingPost.title}
                  onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1113] border border-[#272B2F] text-xs text-white focus:outline-none focus:border-[#FF4500]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#82959B] mb-1">Body Text</label>
                <textarea
                  rows={6}
                  value={editingPost.body}
                  onChange={(e) => setEditingPost({ ...editingPost, body: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1113] border border-[#272B2F] text-xs text-white leading-relaxed focus:outline-none focus:border-[#FF4500]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#82959B] mb-1">Poster Account</label>
                  <select
                    value={editingPost.accountId}
                    onChange={(e) => setEditingPost({ ...editingPost, accountId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0E1113] border border-[#272B2F] text-xs text-white focus:outline-none"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        u/{a.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#82959B] mb-1">Category Flair</label>
                  <select
                    value={editingPost.category}
                    onChange={(e) =>
                      setEditingPost({ ...editingPost, category: e.target.value as PostCategory })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#0E1113] border border-[#272B2F] text-xs text-white focus:outline-none"
                  >
                    <option value="relatable_life">💬 Relatable Life</option>
                    <option value="question">❓ Sawaal-Jawaab</option>
                    <option value="harmless_confession">🤫 Harmless Confession</option>
                    <option value="casual_rant">☕ Chai Tapri Rant</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1A1D20]">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-1.5 rounded-full bg-[#1A1D20] text-xs font-bold text-[#82959B] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-full bg-[#FF4500] hover:bg-[#E03D00] text-xs font-bold text-white shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {accountModalOpen && editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161A] border border-[#272B2F] rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A1D20] mb-3.5">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[#FF4500]" />
                <span>{editingAccount.id ? "Edit Account" : "Add Reddit Account"}</span>
              </h3>
              <button
                onClick={() => setAccountModalOpen(false)}
                className="p-1 rounded text-[#82959B] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#82959B] mb-1">Reddit Username</label>
                <input
                  type="text"
                  placeholder="e.g. mere_se_nhi_hota"
                  value={editingAccount.username || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1113] border border-[#272B2F] text-xs text-white focus:outline-none focus:border-[#FF4500]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#82959B] mb-1">Reddit Client ID</label>
                <input
                  type="text"
                  placeholder="From reddit.com/prefs/apps (optional for drafts)"
                  value={editingAccount.clientId || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, clientId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1113] border border-[#272B2F] text-xs text-white focus:outline-none focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#82959B] mb-1">Reddit Client Secret</label>
                <input
                  type="password"
                  placeholder="From reddit.com/prefs/apps"
                  value={editingAccount.clientSecret || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, clientSecret: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1113] border border-[#272B2F] text-xs text-white focus:outline-none focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#82959B] mb-1">Reddit Password</label>
                <input
                  type="password"
                  placeholder="Account password"
                  value={editingAccount.password || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1113] border border-[#272B2F] text-xs text-white focus:outline-none focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#82959B] mb-1">Daily Post Cap</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={editingAccount.dailyLimit || 2}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, dailyLimit: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1113] border border-[#272B2F] text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1A1D20]">
                <button
                  type="button"
                  onClick={() => setAccountModalOpen(false)}
                  className="px-4 py-1.5 rounded-full bg-[#1A1D20] text-xs font-bold text-[#82959B] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-full bg-[#FF4500] hover:bg-[#E03D00] text-xs font-bold text-white shadow-sm"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
