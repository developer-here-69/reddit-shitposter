import React, { useState, useEffect } from 'react'
import { X, Save, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react'
import { Post, DedupCheckResult, LimitCheckResult } from '../../../shared/types'

interface PostEditorModalProps {
  post: Partial<Post> | null
  onClose: () => void
  onSave: (post: Post) => void
}

const FLAIRS = [
  '💬 Relatable Life',
  '☕ Chai Tapri Debates',
  '🏢 Office Ka Kissa',
  '📼 2000s Nostalgia',
  '🤫 Harmless Confessions',
]

export const PostEditorModal: React.FC<PostEditorModalProps> = ({ post, onClose, onSave }) => {
  if (!post) return null

  const [title, setTitle] = useState(post.title || '')
  const [body, setBody] = useState(post.body || '')
  const [flair, setFlair] = useState(post.flair || '💬 Relatable Life')
  const [status, setStatus] = useState<Post['status']>(post.status || 'draft')
  const [dedupWarning, setDedupWarning] = useState<string | null>(null)
  const [limitWarning, setLimitWarning] = useState<string | null>(null)

  // Real-time title dedup check
  useEffect(() => {
    if (title.trim().length > 10) {
      const timer = setTimeout(async () => {
        try {
          const res = await window.api.checkDedup(title)
          if (res.isDuplicate && res.matchedTitle !== post.title) {
            setDedupWarning(
              `⚠️ Similar title exists (${Math.round(res.similarityScore * 100)}% match): "${res.matchedTitle}"`
            )
          } else {
            setDedupWarning(null)
          }

          const limitRes = await window.api.checkLimits({ title, body })
          if (!limitRes.allowed && limitRes.reason?.includes('Content violation')) {
            setLimitWarning(limitRes.reason)
          } else {
            setLimitWarning(null)
          }
        } catch {}
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [title, body, post.title])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return

    const updated: Post = {
      id: post.id || 'post-' + Date.now().toString(36),
      title: title.trim(),
      body: body.trim(),
      flair,
      status,
      order: post.order || Date.now(),
      createdAt: post.createdAt || new Date().toISOString(),
      postedAt: post.postedAt,
      redditUrl: post.redditUrl,
    }

    onSave(updated)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#14171A] border border-[#272B2F] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#22262B]">
          <h3 className="font-bold text-white text-base">
            {post.id ? 'Edit r/ArreSuno Post' : 'New Draft Post'}
          </h3>
          <button onClick={onClose} className="text-[#82959B] hover:text-white p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real-time Warnings */}
        {dedupWarning && (
          <div className="p-2.5 rounded-xl bg-[#EAB308]/15 border border-[#EAB308]/30 text-[#EAB308] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{dedupWarning}</span>
          </div>
        )}

        {limitWarning && (
          <div className="p-2.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{limitWarning}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-[#82959B] mb-1">
              Title (Relatable & Engaging)
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. What is that one unwritten rule in Indian households?"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E1113] border border-[#272B2F] text-white focus:outline-none focus:border-[#FF4500]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#82959B] mb-1">
              Body Text (Conversational Hinglish)
            </label>
            <textarea
              required
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Arre suno, write relatable paragraphs with an open-ended question at the end..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E1113] border border-[#272B2F] text-white focus:outline-none focus:border-[#FF4500] leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#82959B] mb-1">Flair</label>
              <select
                value={flair}
                onChange={(e) => setFlair(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0E1113] border border-[#272B2F] text-white focus:outline-none focus:border-[#FF4500]"
              >
                {FLAIRS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#82959B] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Post['status'])}
                className="w-full px-3 py-2 rounded-xl bg-[#0E1113] border border-[#272B2F] text-white focus:outline-none focus:border-[#FF4500]"
              >
                <option value="draft">Draft (Needs Review)</option>
                <option value="approved">Approved (Ready to Post)</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#22262B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1A1D20] hover:bg-[#25292E] text-white font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#FF4500] hover:bg-[#E03D00] text-white font-bold shadow-md transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Post</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
