import React from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Shuffle,
  Play,
  Edit3,
  Trash2,
  ExternalLink,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { Post } from '../../../shared/types'

interface PostQueueProps {
  posts: Post[]
  onReorder: (newPosts: Post[]) => void
  onShuffle: () => void
  onEdit: (post: Post) => void
  onDelete: (id: string) => void
  onPostThis: (post: Post) => void
  onPostNext: () => void
  onNewDraft: () => void
}

interface SortableItemProps {
  post: Post
  onEdit: (post: Post) => void
  onDelete: (id: string) => void
  onPostThis: (post: Post) => void
}

const SortablePostItem: React.FC<SortableItemProps> = ({
  post,
  onEdit,
  onDelete,
  onPostThis,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: post.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const getStatusBadge = (status: Post['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] font-bold text-[10px] border border-[#10B981]/30">
            ✓ Approved
          </span>
        )
      case 'posted':
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#38BDF8]/15 text-[#38BDF8] font-bold text-[10px] border border-[#38BDF8]/30">
            Posted
          </span>
        )
      case 'failed':
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#EF4444]/15 text-[#EF4444] font-bold text-[10px] border border-[#EF4444]/30">
            Failed
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#EAB308]/15 text-[#EAB308] font-bold text-[10px] border border-[#EAB308]/30">
            Draft
          </span>
        )
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 bg-[#12161A] hover:bg-[#15191D] border border-[#22262B] rounded-xl flex flex-col gap-2 transition-all shadow-sm"
    >
      {/* Top Row: Drag Handle + Badges + Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            title="Drag to reorder"
            className="text-[#82959B] hover:text-white cursor-grab active:cursor-grabbing p-0.5"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {getStatusBadge(post.status)}

          <span className="px-2 py-0.5 rounded-full bg-[#1A1D20] text-[#82959B] text-[10px] font-semibold border border-[#272B2F] truncate max-w-[120px]">
            {post.flair || '💬 Relatable Life'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(post)}
            title="Edit post"
            className="p-1 hover:text-white text-[#82959B] hover:bg-[#1E2328] rounded cursor-pointer transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(post.id)}
            title="Delete post"
            className="p-1 hover:text-[#EF4444] text-[#82959B] hover:bg-[#2A1517] rounded cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {post.status !== 'posted' && (
            <button
              onClick={() => onPostThis(post)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF4500] hover:bg-[#E03D00] text-white text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>Post</span>
            </button>
          )}
          {post.redditUrl && (
            <a
              href={post.redditUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1 hover:text-[#38BDF8] text-[#82959B] hover:bg-[#18232D] rounded cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className="font-bold text-white text-xs leading-snug line-clamp-2">
        {post.title}
      </h4>

      {/* Body preview */}
      <p className="text-[11px] text-[#82959B] line-clamp-2 leading-relaxed">
        {post.body}
      </p>

      {/* Error reason if failed */}
      {post.error && (
        <div className="text-[10px] text-[#EF4444] bg-[#EF4444]/10 p-1.5 rounded-lg border border-[#EF4444]/20 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span className="truncate">{post.error}</span>
        </div>
      )}
    </div>
  )
}

export const PostQueue: React.FC<PostQueueProps> = ({
  posts,
  onReorder,
  onShuffle,
  onEdit,
  onDelete,
  onPostThis,
  onPostNext,
  onNewDraft,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = posts.findIndex((p) => p.id === active.id)
      const newIndex = posts.findIndex((p) => p.id === over.id)
      const reordered = arrayMove(posts, oldIndex, newIndex).map((p, idx) => ({
        ...p,
        order: idx + 1,
      }))
      onReorder(reordered)
    }
  }

  const queuedPosts = posts.filter((p) => p.status !== 'posted')

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* Queue Header Actions */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-xs uppercase tracking-wider">
            Post Queue ({queuedPosts.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onShuffle}
            title="Randomize post order"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#181C20] hover:bg-[#22272C] text-[#82959B] hover:text-white border border-[#272B2F] text-xs font-semibold transition-colors cursor-pointer"
          >
            <Shuffle className="w-3 h-3" />
            <span>Shuffle</span>
          </button>

          <button
            onClick={onNewDraft}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#181C20] hover:bg-[#22272C] text-[#FF4500] hover:text-[#FF6A33] border border-[#FF4500]/40 text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>New Draft</span>
          </button>

          <button
            onClick={onPostNext}
            disabled={queuedPosts.length === 0}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Play className="w-3 h-3 fill-white" />
            <span>Post Next</span>
          </button>
        </div>
      </div>

      {/* Scrollable Sortable List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
        {queuedPosts.length === 0 ? (
          <div className="py-12 px-4 text-center border border-dashed border-[#272B2F] rounded-2xl bg-[#12161A]/40 space-y-2">
            <FileText className="w-8 h-8 text-[#82959B] mx-auto opacity-50" />
            <p className="text-xs text-[#82959B]">Your post queue is empty.</p>
            <p className="text-[11px] text-[#4E575E]">
              Click "+ New Draft" or use the Gemini Hinglish Generator above to add posts.
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={queuedPosts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {queuedPosts.map((post) => (
                <SortablePostItem
                  key={post.id}
                  post={post}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPostThis={onPostThis}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}
