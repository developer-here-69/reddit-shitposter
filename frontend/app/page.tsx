"use client"

import React, { useState, useEffect } from "react"
import { motion, Reorder, AnimatePresence } from "framer-motion"
import {
  DialogTrigger,
  Modal,
  Dialog,
  Button as AriaButton,
} from "react-aria-components"
import {
  Sparkles,
  Shuffle,
  Plus,
  Send,
  Edit3,
  Trash2,
  Clock,
  ArrowUpDown,
  GripVertical,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
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
} from "lucide-react"
import { RedditAccount, QueuePost, PostCategory } from "@/lib/types"

const CATEGORY_FLAIRS: Record<PostCategory, { label: string; bg: string; text: string }> = {
  relatable_life: { label: "💬 Relatable Life", bg: "#1F2833", text: "#66FCF1" },
  question: { label: "❓ Sawaal-Jawaab", bg: "#2E2836", text: "#DDA0DD" },
  harmless_confession: { label: "🤫 Harmless Confession", bg: "#362E25", text: "#FFB86C" },
  casual_rant: { label: "☕ Chai Tapri Rant", bg: "#332222", text: "#FF6B6B" },
}

export default function RedditDashboard() {
  const [subreddit, setSubreddit] = useState("ArreSuno")
  const [accounts, setAccounts] = useState<RedditAccount[]>([])
  const [posts, setPosts] = useState<QueuePost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"queue" | "history">("queue")
  const [generating, setGenerating] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Edit post modal
  const [editingPost, setEditingPost] = useState<QueuePost | null>(null)

  // Account modal
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Partial<RedditAccount> | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Load data
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

  // Drag & drop mouse reorder with Framer Motion
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

  // Shuffle queue function with mouse click
  const handleShuffle = async () => {
    const queued = posts.filter((p) => p.status === "queued")
    if (queued.length <= 1) {
      showToast("Add at least 2 posts to shuffle the queue!")
      return
    }

    // Fisher-Yates shuffle
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

  // Save or Add account
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

  const queuedPosts = posts
    .filter((p) => p.status === "queued")
    .filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.body.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.order - b.order)

  const historyPosts = posts.filter((p) => p.status !== "queued")

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#F2F4F5] antialiased">
      {/* Toast */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#181C1F] border border-[#343536] text-[#F2F4F5] rounded-full shadow-2xl text-xs font-semibold"
        >
          <div className="w-2 h-2 rounded-full bg-[#FF4500]" />
          <span>{toastMessage}</span>
        </motion.div>
      )}

      {/* Reddit Header Navbar */}
      <header className="sticky top-0 z-40 bg-[#12161A] border-b border-[#22272B] px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Reddit Logo Icon */}
          <div className="w-8 h-8 rounded-full bg-[#FF4500] flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 fill-white" viewBox="0 0 20 20">
              <path d="M10 0a10 10 0 1 0 10 10A10 10 0 0 0 10 0zm6.5 10.8a1.9 1.9 0 0 1-1.9 1.8 4.7 4.7 0 0 1-4.6 2.4 4.7 4.7 0 0 1-4.6-2.4 1.9 1.9 0 0 1-1.9-1.8 1.9 1.9 0 0 1 1-1.7 4 4 0 0 1 0-.9 4.3 4.3 0 0 1 4.5-4.3l.8-3.7 2.6.6a1.3 1.3 0 1 1 2.5.4l-3.2-.7-.7 3.4a4.4 4.4 0 0 1 4.5 4.3 4 4 0 0 1 0 .9 1.9 1.9 0 0 1 1 1.7z" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-white tracking-tight">reddit</span>
            <span className="text-[#82959B] text-xs">/</span>
            <span className="font-semibold text-sm text-[#F2F4F5]">r/{subreddit}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#22272B] text-[#FF4500] border border-[#2D343A]">
              Mod Studio
            </span>
          </div>
        </div>

        {/* Center Search / Filter Bar */}
        <div className="hidden md:flex items-center gap-2 bg-[#0B0E11] border border-[#22272B] rounded-full px-3.5 py-1.5 w-80 text-xs">
          <Search className="w-3.5 h-3.5 text-[#82959B]" />
          <input
            type="text"
            placeholder="Search queued posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-white focus:outline-none w-full text-xs placeholder:text-[#82959B]"
          />
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleShuffle}
            title="Randomly shuffle the queue order"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1A1F24] hover:bg-[#252C33] text-[#F2F4F5] text-xs font-semibold border border-[#2D343A] cursor-pointer transition-colors shadow-sm"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#FF4500]" />
            <span className="hidden sm:inline">Shuffle Queue</span>
          </button>

          <button
            onClick={() => handleGenerate("relatable_life")}
            disabled={generating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-bold cursor-pointer transition-colors shadow-sm disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
            <span>{generating ? "Drafting..." : "Generate Post"}</span>
          </button>

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
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#1A1F24] hover:bg-[#252C33] text-[#F2F4F5] text-xs font-semibold border border-[#2D343A] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Account</span>
          </button>
        </div>
      </header>

      {/* Subreddit Community Banner Bar (Authentic Reddit look) */}
      <div className="bg-[#151A1E] border-b border-[#22272B] px-4 py-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#FF4500] text-white font-black text-xl flex items-center justify-center border-2 border-[#22272B]">
              AS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg text-white">r/{subreddit}</h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#22272B] text-[#82959B]">
                  Hinglish Community
                </span>
              </div>
              <p className="text-xs text-[#82959B]">
                Arre suno... relatable banter, everyday confessions & discussions for Indians
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#82959B]">
            <div className="flex items-center gap-1.5 bg-[#0B0E11] px-3 py-1.5 rounded-full border border-[#22272B]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span className="font-semibold text-white">{queuedPosts.length} in Queue</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#0B0E11] px-3 py-1.5 rounded-full border border-[#22272B]">
              <User className="w-3.5 h-3.5 text-[#24A0ED]" />
              <span className="font-semibold text-white">{accounts.length} Accounts Rotating</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Account Rotation Carousel */}
        <section className="bg-[#12161A] border border-[#22272B] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#82959B]">
                Rotating Poster Accounts
              </span>
              <span className="text-[10px] text-[#596277]">(Each posts 2–3 times a day)</span>
            </div>
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
              className="text-xs text-[#FF4500] hover:underline font-semibold cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add account</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className={`p-3 rounded-xl border transition-all ${
                  acc.isActive
                    ? "bg-[#181D22] border-[#2B3238]"
                    : "bg-[#121518] border-[#1C2024] opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: acc.color || "#FF4500" }}
                    />
                    <span className="font-bold text-xs text-white">u/{acc.username}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleAccount(acc)}
                      title={acc.isActive ? "Pause posting from this account" : "Activate account"}
                      className={`p-1 rounded cursor-pointer ${
                        acc.isActive ? "text-[#10B981] hover:bg-[#10B981]/10" : "text-[#82959B] hover:bg-[#82959B]/10"
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

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#82959B] pt-2 border-t border-[#22272B]">
                  <span>Daily: {acc.postedToday}/{acc.dailyLimit} posted</span>
                  <span className={acc.clientId ? "text-[#10B981] font-mono" : "text-[#EAB308]"}>
                    {acc.clientId ? "Ready" : "No Auth"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tab Selector (Hot Queue / History) */}
        <div className="flex items-center justify-between border-b border-[#22272B] pb-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("queue")}
              className={`flex items-center gap-2 text-sm font-bold pb-2 -mb-2.5 transition-colors cursor-pointer border-b-2 ${
                activeTab === "queue"
                  ? "border-[#FF4500] text-white"
                  : "border-transparent text-[#82959B] hover:text-[#C1CAD0]"
              }`}
            >
              <Flame className="w-4 h-4 text-[#FF4500]" />
              <span>Upcoming Queue ({queuedPosts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 text-sm font-bold pb-2 -mb-2.5 transition-colors cursor-pointer border-b-2 ${
                activeTab === "history"
                  ? "border-[#FF4500] text-white"
                  : "border-transparent text-[#82959B] hover:text-[#C1CAD0]"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span>Posted Archive ({historyPosts.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#82959B] hidden sm:inline">
              Drag cards with mouse to reorder
            </span>
            <button
              onClick={handleShuffle}
              className="p-1.5 rounded-lg bg-[#151A1E] border border-[#22272B] text-[#82959B] hover:text-white cursor-pointer"
              title="Shuffle queue"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Feed Cards Section */}
        {activeTab === "queue" && (
          <div>
            {queuedPosts.length === 0 ? (
              <div className="text-center py-16 bg-[#12161A] border border-dashed border-[#22272B] rounded-2xl">
                <Clock className="w-10 h-10 text-[#49545C] mx-auto mb-3" />
                <h3 className="font-bold text-white text-base">Your queue is empty</h3>
                <p className="text-xs text-[#82959B] max-w-sm mx-auto mt-1 mb-4">
                  Generate fresh Hinglish discussion topics with Gemini to keep r/{subreddit} active.
                </p>
                <button
                  onClick={() => handleGenerate("relatable_life")}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-bold cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Next Post</span>
                </button>
              </div>
            ) : (
              /* Framer Motion Reorder.Group for smooth mouse drag and drop! */
              <Reorder.Group
                axis="y"
                values={queuedPosts}
                onReorder={handleReorder}
                className="space-y-3.5"
              >
                {queuedPosts.map((post, idx) => {
                  const assignedAcc = accounts.find((a) => a.id === post.accountId)
                  const flair = CATEGORY_FLAIRS[post.category] || CATEGORY_FLAIRS.relatable_life
                  return (
                    <Reorder.Item
                      key={post.id}
                      value={post}
                      whileDrag={{ scale: 1.015, boxShadow: "0 12px 32px rgba(0,0,0,0.8)" }}
                      className="bg-[#12161A] hover:bg-[#151A1E] border border-[#22272B] hover:border-[#2D343A] rounded-2xl p-4 transition-colors cursor-default select-none group"
                    >
                      {/* Reddit Post Header */}
                      <div className="flex items-center justify-between text-xs text-[#82959B] mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="w-5 h-5 rounded-full bg-[#FF4500] text-white font-bold text-[9px] flex items-center justify-center">
                            r/
                          </div>
                          <span className="font-bold text-white">r/{subreddit}</span>
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
                          <span className="text-[#82959B] flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            Scheduled:{" "}
                            {new Date(post.scheduledAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* Drag Handle with Grip icon */}
                        <div
                          className="flex items-center gap-1 text-[#556066] group-hover:text-[#82959B] cursor-grab active:cursor-grabbing px-2 py-1 rounded bg-[#0B0E11] border border-[#1F2428]"
                          title="Click and drag with mouse to reorder"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-mono font-bold">#{idx + 1}</span>
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

                      {/* Post Body (Reddit Self-Text look) */}
                      <p className="text-xs text-[#D7DADC] leading-relaxed whitespace-pre-wrap font-normal mb-4">
                        {post.body}
                      </p>

                      {/* Reddit Action Bar at Bottom */}
                      <div className="flex items-center justify-between border-t border-[#1C2126] pt-3 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingPost(post)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#181D22] hover:bg-[#222830] text-[#82959B] hover:text-white font-semibold cursor-pointer border border-[#262D33]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Post</span>
                          </button>

                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#181D22] hover:bg-[#2B1B1D] text-[#82959B] hover:text-[#EF4444] cursor-pointer border border-[#262D33]"
                            title="Delete from queue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => handlePublishNow(post.id)}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#FF4500] hover:bg-[#E03D00] text-white font-bold cursor-pointer shadow-sm text-xs"
                        >
                          <Send className="w-3 h-3" />
                          <span>Post to Reddit Now</span>
                        </button>
                      </div>
                    </Reorder.Item>
                  )
                })}
              </Reorder.Group>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-3">
            {historyPosts.length === 0 ? (
              <div className="text-center py-16 text-xs text-[#82959B]">
                No posts published yet. Once a queued post is published, it will be archived here with its live Reddit link.
              </div>
            ) : (
              historyPosts.map((post) => {
                const assignedAcc = accounts.find((a) => a.id === post.accountId)
                return (
                  <div
                    key={post.id}
                    className="p-4 rounded-xl bg-[#12161A] border border-[#22272B] flex items-center justify-between"
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
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A1F24] text-xs font-semibold text-[#24A0ED] hover:text-white border border-[#2D343A]"
                      >
                        <span>View Live</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* React Aria Dialog Modal: Edit Post */}
      {editingPost && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161A] border border-[#2C343B] rounded-2xl w-full max-w-xl p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#22272B] mb-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
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

            <form onSubmit={handleSavePost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#82959B] mb-1">Post Title</label>
                <input
                  type="text"
                  value={editingPost.title}
                  onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2C343B] text-sm text-white focus:outline-none focus:border-[#FF4500]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#82959B] mb-1">Post Body (Markdown)</label>
                <textarea
                  rows={6}
                  value={editingPost.body}
                  onChange={(e) => setEditingPost({ ...editingPost, body: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2C343B] text-xs text-white leading-relaxed focus:outline-none focus:border-[#FF4500]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#82959B] mb-1">Assigned Account</label>
                  <select
                    value={editingPost.accountId}
                    onChange={(e) => setEditingPost({ ...editingPost, accountId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0E11] border border-[#2C343B] text-xs text-white focus:outline-none"
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
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0E11] border border-[#2C343B] text-xs text-white focus:outline-none"
                  >
                    <option value="relatable_life">💬 Relatable Life</option>
                    <option value="question">❓ Sawaal-Jawaab</option>
                    <option value="harmless_confession">🤫 Harmless Confession</option>
                    <option value="casual_rant">☕ Chai Tapri Rant</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#22272B]">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-2 rounded-full bg-[#181D22] text-xs font-bold text-[#82959B] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#FF4500] hover:bg-[#E03D00] text-xs font-bold text-white shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161A] border border-[#2C343B] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#22272B] mb-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
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

            <form onSubmit={handleSaveAccount} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#82959B] mb-1">Reddit Username</label>
                <input
                  type="text"
                  placeholder="e.g. mere_se_nhi_hota"
                  value={editingAccount.username || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0E11] border border-[#2C343B] text-sm text-white focus:outline-none focus:border-[#FF4500]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#82959B] mb-1">
                  Reddit Client ID (from reddit.com/prefs/apps)
                </label>
                <input
                  type="text"
                  placeholder="Optional for drafting"
                  value={editingAccount.clientId || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, clientId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0E11] border border-[#2C343B] text-xs text-white focus:outline-none focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#82959B] mb-1">Reddit Client Secret</label>
                <input
                  type="password"
                  placeholder="Optional for drafting"
                  value={editingAccount.clientSecret || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, clientSecret: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0E11] border border-[#2C343B] text-xs text-white focus:outline-none focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#82959B] mb-1">Reddit Password</label>
                <input
                  type="password"
                  placeholder="Account password"
                  value={editingAccount.password || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0E11] border border-[#2C343B] text-xs text-white focus:outline-none focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#82959B] mb-1">Daily Post Limit</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={editingAccount.dailyLimit || 2}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, dailyLimit: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0E11] border border-[#2C343B] text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#22272B]">
                <button
                  type="button"
                  onClick={() => setAccountModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-[#181D22] text-xs font-bold text-[#82959B] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#FF4500] hover:bg-[#E03D00] text-xs font-bold text-white shadow-sm"
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
