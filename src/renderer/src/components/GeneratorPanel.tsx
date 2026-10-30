import React, { useState } from 'react'
import { Sparkles, AlertCircle, CheckCircle2, Copy, Plus } from 'lucide-react'
import { PostCategory, Post } from '../../../shared/types'

interface GeneratorPanelProps {
  hasKey: boolean
  onOpenSettings: () => void
  onPostGenerated: (post: Post) => void
}

const CATEGORIES: { id: PostCategory; icon: string; label: string }[] = [
  { id: 'Relatable Life', icon: '💬', label: 'Relatable Life' },
  { id: 'Chai Tapri Debates', icon: '☕', label: 'Chai Tapri' },
  { id: 'Office Ka Kissa', icon: '🏢', label: 'Office/College' },
  { id: '2000s Nostalgia', icon: '📼', label: '2000s Nostalgia' },
  { id: 'Harmless Confessions', icon: '🤫', label: 'Confessions' },
]

export const GeneratorPanel: React.FC<GeneratorPanelProps> = ({
  hasKey,
  onOpenSettings,
  onPostGenerated,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('Relatable Life')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dedupWarning, setDedupWarning] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!hasKey) {
      onOpenSettings()
      return
    }

    setIsGenerating(true)
    setError(null)
    setDedupWarning(null)

    try {
      const generated = await window.api.generatePost(selectedCategory)

      // Check deduplication similarity with existing posts
      const dedupCheck = await window.api.checkDedup(generated.title)
      if (dedupCheck.isDuplicate) {
        setDedupWarning(
          `Notice: Generated title is ${Math.round(dedupCheck.similarityScore * 100)}% similar to previous post: "${dedupCheck.matchedTitle}". Please review/edit before approving.`
        )
      }

      const newPost: Post = {
        id: 'post-' + Date.now().toString(36),
        title: generated.title,
        body: generated.body,
        flair: generated.flair,
        status: 'draft', // Generated posts always start as draft per spec
        order: Date.now(),
        createdAt: new Date().toISOString(),
      }

      await window.api.savePost(newPost)
      onPostGenerated(newPost)
    } catch (err: any) {
      setError(err.message || 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="bg-[#12161A] border border-[#22262B] rounded-2xl p-4 space-y-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#FF4500]" />
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">
            Gemini Hinglish Generator
          </h3>
        </div>
        {!hasKey && (
          <button
            onClick={onOpenSettings}
            className="text-[11px] text-[#EAB308] hover:underline cursor-pointer font-semibold"
          >
            Add API Key ⚠️
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              selectedCategory === c.id
                ? 'bg-[#FF4500] text-white shadow-sm'
                : 'bg-[#181C20] text-[#82959B] hover:text-white border border-[#272B2F]'
            }`}
          >
            <span>{c.icon}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Dedup Warning if similar title detected */}
      {dedupWarning && (
        <div className="p-2.5 rounded-xl bg-[#EAB308]/15 border border-[#EAB308]/30 text-[#EAB308] text-[11px] leading-relaxed flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{dedupWarning}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-2.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-[11px] leading-relaxed flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full py-2.5 rounded-xl bg-[#FF4500] hover:bg-[#E03D00] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
      >
        {isGenerating ? (
          <>
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>Generating Natural Hinglish Post...</span>
          </>
        ) : (
          <>
            <Plus className="w-3.5 h-3.5" />
            <span>Draft New {selectedCategory} Post</span>
          </>
        )}
      </button>
    </div>
  )
}
