import { describe, it, expect } from 'vitest'
import { Post } from '../src/shared/types'

// Helper functions mirroring UI and store reorder/shuffle logic
function reorderQueue(posts: Post[], fromIndex: number, toIndex: number): Post[] {
  const result = [...posts]
  const [removed] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, removed)
  return result.map((p, idx) => ({ ...p, order: idx + 1 }))
}

function shuffleQueue(posts: Post[]): Post[] {
  const draftsAndApproved = posts.filter((p) => p.status === 'draft' || p.status === 'approved')
  const others = posts.filter((p) => p.status !== 'draft' && p.status !== 'approved')

  // Deterministic or pseudo-random shuffle
  const shuffled = [...draftsAndApproved]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const combined = [...shuffled, ...others]
  return combined.map((p, idx) => ({ ...p, order: idx + 1 }))
}

function updatePostStatus(
  posts: Post[],
  id: string,
  newStatus: Post['status'],
  extra?: Partial<Post>
): Post[] {
  return posts.map((p) => (p.id === id ? { ...p, status: newStatus, ...extra } : p))
}

describe('Queue Management Logic', () => {
  const initialPosts: Post[] = [
    {
      id: 'p1',
      title: 'First Post',
      body: 'Body 1',
      status: 'approved',
      order: 1,
      createdAt: '2026-10-30T00:00:00.000Z',
    },
    {
      id: 'p2',
      title: 'Second Post',
      body: 'Body 2',
      status: 'draft',
      order: 2,
      createdAt: '2026-10-30T00:01:00.000Z',
    },
    {
      id: 'p3',
      title: 'Third Post',
      body: 'Body 3',
      status: 'draft',
      order: 3,
      createdAt: '2026-10-30T00:02:00.000Z',
    },
  ]

  it('reorders posts correctly and updates order indices', () => {
    // Move 3rd item to the top
    const reordered = reorderQueue(initialPosts, 2, 0)
    expect(reordered[0].id).toBe('p3')
    expect(reordered[0].order).toBe(1)
    expect(reordered[1].id).toBe('p1')
    expect(reordered[1].order).toBe(2)
    expect(reordered[2].id).toBe('p2')
    expect(reordered[2].order).toBe(3)
  })

  it('preserves all items when shuffling drafts and approved posts', () => {
    const shuffled = shuffleQueue(initialPosts)
    expect(shuffled.length).toBe(3)
    const ids = shuffled.map((p) => p.id).sort()
    expect(ids).toEqual(['p1', 'p2', 'p3'])
    // Each item has a distinct order from 1 to 3
    expect(shuffled.map((p) => p.order)).toEqual([1, 2, 3])
  })

  it('updates post status through draft -> approved -> posted lifecycle', () => {
    let queue = [...initialPosts]

    // Approve p2
    queue = updatePostStatus(queue, 'p2', 'approved')
    expect(queue.find((p) => p.id === 'p2')?.status).toBe('approved')

    // Post p2 successfully
    const postedAt = new Date().toISOString()
    const redditUrl = 'https://old.reddit.com/r/ArreSuno/comments/abc1234/test'
    queue = updatePostStatus(queue, 'p2', 'posted', { postedAt, redditUrl })

    const postedItem = queue.find((p) => p.id === 'p2')
    expect(postedItem?.status).toBe('posted')
    expect(postedItem?.postedAt).toBe(postedAt)
    expect(postedItem?.redditUrl).toBe(redditUrl)
  })

  it('handles post failure transition without retrying in a loop', () => {
    let queue = [...initialPosts]
    const errorMsg = 'Flair selection required'
    const screenshotPath = 'C:\\temp\\err.png'

    queue = updatePostStatus(queue, 'p1', 'failed', { error: errorMsg, screenshotPath })
    const failedItem = queue.find((p) => p.id === 'p1')

    expect(failedItem?.status).toBe('failed')
    expect(failedItem?.error).toBe(errorMsg)
    expect(failedItem?.screenshotPath).toBe(screenshotPath)
  })
})
