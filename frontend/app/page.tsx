"use client"

import React, { useState, useEffect } from "react"
import {
  Calendar,
  Clock,
  Plus,
  Sparkles,
  User,
  Trash2,
  Edit3,
  Send,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  RefreshCw,
  Settings,
  X,
  Play,
  Pause,
  Layers,
  ChevronRight,
} from "lucide-react"
import { RedditAccount, QueuePost, PostCategory } from "@/lib/types"

export default function Dashboard() {
  const [subreddit, setSubreddit] = useState("ArreSuno")
  const [accounts, setAccounts] = useState<RedditAccount[]>([])
  const [posts, setPosts] = useState<QueuePost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"queue" | "history">("queue")
  const [generating, setGenerating] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Edit post modal
  const [editingPost, setEditingPost] = useState<QueuePost | null>(null)

  // Account modal
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Partial<RedditAccount> | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Load state from API
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
      showToast("Error loading dashboard data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

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
    if (!confirm("Are you sure you want to remove this post from the queue?")) return
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

  // Reorder post
  const handleMove = async (index: number, direction: "up" | "down") => {
    const queued = posts.filter((p) => p.status === "queued")
    const targetIdx = direction === "up" ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= queued.length) return

    const newQueued = [...queued]
    const temp = newQueued[index]
    newQueued[index] = newQueued[targetIdx]
    newQueued[targetIdx] = temp

    // Update order numbers
    newQueued.forEach((p, idx) => (p.order = idx + 1))

    const otherPosts = posts.filter((p) => p.status !== "queued")
    const combined = [...newQueued, ...otherPosts]
    setPosts(combined)

    await fetch("/api/posts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", posts: combined }),
    })
    showToast("Queue reordered")
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
        showToast(`Account u/${account.username} is now ${data.account.isActive ? "Active" : "Paused"}`)
      }
    } catch {
      showToast("Error updating account")
    }
  }

  // Publish immediate
  const handlePublishNow = async (postId: string) => {
    try {
      showToast("Sending post to Reddit...")
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

  const queuedPosts = posts.filter((p) => p.status === "queued")
  const historyPosts = posts.filter((p) => p.status !== "queued")

  return (
    <div className="min-h-screen bg-[#090a0f] text-[#f1f3f7] font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#131622] border border-[#23283c] rounded-lg shadow-xl text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-[#ff4500]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#161a29] bg-[#090a0f]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#ff4500] flex items-center justify-center font-bold text-white text-base shadow-sm">
              r/
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base tracking-tight text-white">{subreddit}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#131724] text-[#8e98b0] border border-[#1e2438]">
                  AutoPoster
                </span>
              </div>
              <p className="text-xs text-[#6e778f]">Multi-Account Scheduling & Queue</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleGenerate("relatable_life")}
              disabled={generating}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#191e30] hover:bg-[#20273d] text-white text-xs font-medium border border-[#2a324d] transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 text-[#ff4500] ${generating ? "animate-spin" : ""}`} />
              <span>{generating ? "Generating..." : "Generate AI Post"}</span>
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#ff4500] hover:bg-[#e03d00] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Account</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Account Bar Section */}
        <section>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#79839c] flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              <span>Reddit Accounts Rotation ({accounts.length})</span>
            </h2>
            <span className="text-xs text-[#5e667c]">Staggered 2–3 posts daily per account</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 rounded-xl bg-[#0f121d] border border-[#1b2032] hover:border-[#272e48] transition-all relative group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: acc.color || "#ff4500" }}
                    />
                    <div>
                      <span className="font-semibold text-sm text-white">u/{acc.username}</span>
                      <div className="flex items-center gap-2 text-[11px] text-[#69728b] mt-0.5">
                        <span>Limit: {acc.dailyLimit} / day</span>
                        <span>•</span>
                        <span>Posted today: {acc.postedToday}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleAccount(acc)}
                      title={acc.isActive ? "Pause account" : "Activate account"}
                      className={`p-1.5 rounded-md border text-xs cursor-pointer transition-colors ${
                        acc.isActive
                          ? "bg-[#13221c] border-[#1d3d2f] text-[#10b981] hover:bg-[#183126]"
                          : "bg-[#20181b] border-[#3d1d25] text-[#f43f5e] hover:bg-[#2c1c21]"
                      }`}
                    >
                      {acc.isActive ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingAccount(acc)
                        setAccountModalOpen(true)
                      }}
                      className="p-1.5 rounded-md bg-[#161a29] border border-[#21273d] text-[#8690ab] hover:text-white cursor-pointer transition-colors"
                    >
                      <Settings className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#161a2b] flex items-center justify-between text-[11px]">
                  <span
                    className={`inline-flex items-center gap-1 font-mono ${
                      acc.clientId ? "text-[#10b981]" : "text-[#eab308]"
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    {acc.clientId ? "API Configured" : "Credentials Pending"}
                  </span>
                  <span className="text-[#596277]">
                    {acc.isActive ? "Ready for Next Slot" : "Currently Paused"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Queue and History Tabs */}
        <section>
          <div className="flex items-center justify-between border-b border-[#171c2c] pb-3 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("queue")}
                className={`text-sm font-medium pb-2 -mb-3 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "queue"
                    ? "border-[#ff4500] text-white"
                    : "border-transparent text-[#707994] hover:text-[#9ea7c2]"
                }`}
              >
                Scheduled Queue ({queuedPosts.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`text-sm font-medium pb-2 -mb-3 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "history"
                    ? "border-[#ff4500] text-white"
                    : "border-transparent text-[#707994] hover:text-[#9ea7c2]"
                }`}
              >
                Posted Archive ({historyPosts.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="p-1.5 rounded-md bg-[#131724] border border-[#1e2439] text-[#7d87a2] hover:text-white transition-colors cursor-pointer"
                title="Refresh queue"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Queue Tab Content */}
          {activeTab === "queue" && (
            <div className="space-y-4">
              {queuedPosts.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-dashed border-[#1a1f33] bg-[#0c0e18]">
                  <Clock className="w-10 h-10 text-[#49516a] mx-auto mb-3" />
                  <p className="text-sm font-medium text-white">Your queue is empty</p>
                  <p className="text-xs text-[#6e778f] mt-1 mb-4">
                    Click the button below to generate 3 fresh, human-like Hinglish posts with Gemini.
                  </p>
                  <button
                    onClick={() => handleGenerate("relatable_life")}
                    disabled={generating}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ff4500] hover:bg-[#e03d00] text-white text-xs font-semibold cursor-pointer shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Discussion Now</span>
                  </button>
                </div>
              ) : (
                queuedPosts.map((post, idx) => {
                  const assignedAcc = accounts.find((a) => a.id === post.accountId)
                  return (
                    <div
                      key={post.id}
                      className="p-5 rounded-xl bg-[#0f121d] border border-[#1a1e2f] hover:border-[#272e48] transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#171b2b] text-[#8692af] border border-[#23293e]">
                            #{idx + 1}
                          </span>
                          <span className="text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#151c2f] text-[#60a5fa] border border-[#202f54]">
                            {post.category}
                          </span>
                          {assignedAcc && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded bg-[#141724] border border-[#21263d]">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: assignedAcc.color }}
                              />
                              <span className="text-[#c1c9dc]">u/{assignedAcc.username}</span>
                            </span>
                          )}
                          <span className="text-xs text-[#5e667e] flex items-center gap-1 ml-auto sm:ml-0 font-mono">
                            <Clock className="w-3 h-3" />
                            {new Date(post.scheduledAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <h3 className="font-semibold text-base text-white leading-snug">{post.title}</h3>
                        <p className="text-xs text-[#8e98b0] line-clamp-3 leading-relaxed font-normal">
                          {post.body}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex sm:flex-col items-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#161a29]">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMove(idx, "up")}
                            disabled={idx === 0}
                            className="p-1.5 rounded-md bg-[#141724] border border-[#20263c] text-[#818ba4] hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Move up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMove(idx, "down")}
                            disabled={idx === queuedPosts.length - 1}
                            className="p-1.5 rounded-md bg-[#141724] border border-[#20263c] text-[#818ba4] hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Move down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingPost(post)}
                            className="p-1.5 rounded-md bg-[#141724] border border-[#20263c] text-[#818ba4] hover:text-white cursor-pointer"
                            title="Edit post"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1.5 rounded-md bg-[#141724] border border-[#20263c] text-[#818ba4] hover:text-[#ef4444] cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => handlePublishNow(post.id)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-[#ff4500] hover:bg-[#e03d00] text-white text-xs font-semibold w-full cursor-pointer shadow-sm"
                        >
                          <Send className="w-3 h-3" />
                          <span>Post Now</span>
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="space-y-3">
              {historyPosts.length === 0 ? (
                <div className="text-center py-16 text-xs text-[#5e667e]">
                  No past posts recorded yet.
                </div>
              ) : (
                historyPosts.map((post) => {
                  const assignedAcc = accounts.find((a) => a.id === post.accountId)
                  return (
                    <div
                      key={post.id}
                      className="p-4 rounded-xl bg-[#0f121d] border border-[#171b2b] flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                          <span className="font-medium text-sm text-white">{post.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#6e778f]">
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
                          className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#151a29] text-xs font-medium text-[#8ea0c4] hover:text-white border border-[#21293e]"
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
        </section>
      </main>

      {/* Edit Post Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f121d] border border-[#23293e] rounded-2xl w-full max-w-xl p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#191e30] mb-4">
              <h3 className="font-semibold text-base text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#ff4500]" />
                <span>Edit Queued Post</span>
              </h3>
              <button
                onClick={() => setEditingPost(null)}
                className="p-1 rounded text-[#717b96] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePost} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8792ad] mb-1">Title</label>
                <input
                  type="text"
                  value={editingPost.title}
                  onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#141724] border border-[#242b40] text-sm text-white focus:outline-none focus:border-[#ff4500]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8792ad] mb-1">Body Text</label>
                <textarea
                  rows={6}
                  value={editingPost.body}
                  onChange={(e) => setEditingPost({ ...editingPost, body: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#141724] border border-[#242b40] text-xs text-white leading-relaxed focus:outline-none focus:border-[#ff4500]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#8792ad] mb-1">Assigned Account</label>
                  <select
                    value={editingPost.accountId}
                    onChange={(e) => setEditingPost({ ...editingPost, accountId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#141724] border border-[#242b40] text-xs text-white focus:outline-none"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        u/{a.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#8792ad] mb-1">Scheduled Time</label>
                  <input
                    type="datetime-local"
                    value={new Date(editingPost.scheduledAt).toISOString().slice(0, 16)}
                    onChange={(e) =>
                      setEditingPost({ ...editingPost, scheduledAt: new Date(e.target.value).toISOString() })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#141724] border border-[#242b40] text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#181d2f]">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-2 rounded-lg bg-[#161a29] text-xs font-medium text-[#929db8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#ff4500] hover:bg-[#e03d00] text-xs font-semibold text-white shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Account Modal */}
      {accountModalOpen && editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f121d] border border-[#23293e] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#191e30] mb-4">
              <h3 className="font-semibold text-base text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[#ff4500]" />
                <span>{editingAccount.id ? "Edit Account" : "Add Reddit Account"}</span>
              </h3>
              <button
                onClick={() => setAccountModalOpen(false)}
                className="p-1 rounded text-[#717b96] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#8792ad] mb-1">Reddit Username</label>
                <input
                  type="text"
                  placeholder="e.g. mere_se_nhi_hota"
                  value={editingAccount.username || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#141724] border border-[#242b40] text-sm text-white focus:outline-none focus:border-[#ff4500]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8792ad] mb-1">
                  Reddit Client ID (Optional for draft queue)
                </label>
                <input
                  type="text"
                  placeholder="Under 'personal use script'"
                  value={editingAccount.clientId || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, clientId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#141724] border border-[#242b40] text-xs text-white focus:outline-none focus:border-[#ff4500]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8792ad] mb-1">
                  Reddit Client Secret (Optional for draft queue)
                </label>
                <input
                  type="password"
                  placeholder="Secret from reddit.com/prefs/apps"
                  value={editingAccount.clientSecret || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, clientSecret: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#141724] border border-[#242b40] text-xs text-white focus:outline-none focus:border-[#ff4500]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8792ad] mb-1">
                  Reddit Password (Only for direct posting)
                </label>
                <input
                  type="password"
                  placeholder="Reddit account password"
                  value={editingAccount.password || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#141724] border border-[#242b40] text-xs text-white focus:outline-none focus:border-[#ff4500]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8792ad] mb-1">Daily Post Cap</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={editingAccount.dailyLimit || 2}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, dailyLimit: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#141724] border border-[#242b40] text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#181d2f]">
                <button
                  type="button"
                  onClick={() => setAccountModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#161a29] text-xs font-medium text-[#929db8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#ff4500] hover:bg-[#e03d00] text-xs font-semibold text-white shadow-sm"
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
