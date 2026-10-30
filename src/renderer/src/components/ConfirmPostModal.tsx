import React from 'react'
import { AlertTriangle, Send, X, ShieldCheck } from 'lucide-react'
import { Post, LimitCheckResult } from '../../../shared/types'

interface ConfirmPostModalProps {
  post: Post | null
  limitCheck: LimitCheckResult | null
  onClose: () => void
  onApprove: (post: Post) => void
}

export const ConfirmPostModal: React.FC<ConfirmPostModalProps> = ({
  post,
  limitCheck,
  onClose,
  onApprove,
}) => {
  if (!post) return null

  const isBlockedByLimits = limitCheck ? !limitCheck.allowed : false

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#14171A] border border-[#272B2F] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#22262B]">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <ShieldCheck className="w-5 h-5 text-[#FF4500]" />
            <span>Approve Submission to r/ArreSuno</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#82959B] hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Safety Limits Notice if violated */}
        {isBlockedByLimits && limitCheck && (
          <div className="p-3.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-xs text-[#EF4444] space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Safety Rule Constraint</span>
            </div>
            <p className="text-[11px] text-[#FCA5A5] leading-relaxed">{limitCheck.reason}</p>
          </div>
        )}

        {/* Post Preview Card */}
        <div className="bg-[#0E1113] border border-[#22262B] rounded-xl p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-[11px] text-[#82959B]">
            <span>Community: <strong className="text-white">r/ArreSuno</strong></span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#1A1D20] text-[#FF4500] font-bold border border-[#2B2F35]">
              {post.flair || '💬 Relatable Life'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-[#82959B] block mb-0.5">Post Title</span>
            <h3 className="font-bold text-white text-sm leading-snug">{post.title}</h3>
          </div>

          <div>
            <span className="text-[11px] font-bold text-[#82959B] block mb-0.5">Post Body</span>
            <div className="bg-[#12161A] p-3 rounded-lg border border-[#1A1D20] text-[#C8D1D7] text-xs leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
              {post.body}
            </div>
          </div>
        </div>

        {/* Mandatory Explicit User Approval Notice */}
        <div className="flex items-start gap-2 text-[11px] text-[#82959B] bg-[#181C20] p-3 rounded-xl border border-[#22262B]">
          <span className="text-[#FF4500] font-bold">Mandatory:</span>
          <span>
            ArreSuno Poster does not allow unattended posting. The visible agent will control the embedded view to type and submit this exact content only after you click Approve.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#22262B]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1A1D20] hover:bg-[#25292E] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            disabled={isBlockedByLimits}
            onClick={() => onApprove(post)}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-bold shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Approve & Start Agent 🚀</span>
          </button>
        </div>
      </div>
    </div>
  )
}
