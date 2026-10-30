import { describe, it, expect } from 'vitest'
import { checkSafetyLimits, DEFAULT_SAFETY_LIMITS } from '../src/main/limits'
import { Post } from '../src/shared/types'

describe('Safety Limits Engine', () => {
  const baseTime = new Date('2026-10-30T12:00:00.000Z')

  it('allows posting when queue history is empty and content is clean', () => {
    const post = { title: 'What is your favourite evening chai snack?', body: 'Arre suno, samosa or biscuit?' }
    const result = checkSafetyLimits(post, [], DEFAULT_SAFETY_LIMITS, baseTime)
    expect(result.allowed).toBe(true)
    expect(result.dailyCount).toBe(0)
  })

  it('enforces maximum 3 posts per 24 hours', () => {
    const history: Post[] = [
      {
        id: 'p1',
        title: 'Post 1',
        body: 'Body 1',
        status: 'posted',
        order: 1,
        createdAt: '2026-10-30T02:00:00.000Z',
        postedAt: '2026-10-30T02:00:00.000Z',
      },
      {
        id: 'p2',
        title: 'Post 2',
        body: 'Body 2',
        status: 'posted',
        order: 2,
        createdAt: '2026-10-30T05:00:00.000Z',
        postedAt: '2026-10-30T05:00:00.000Z',
      },
      {
        id: 'p3',
        title: 'Post 3',
        body: 'Body 3',
        status: 'posted',
        order: 3,
        createdAt: '2026-10-30T08:00:00.000Z',
        postedAt: '2026-10-30T08:00:00.000Z',
      },
    ]

    const candidate = { title: 'Post 4 candidate', body: 'Testing daily limit' }
    const result = checkSafetyLimits(candidate, history, DEFAULT_SAFETY_LIMITS, baseTime)

    expect(result.allowed).toBe(false)
    expect(result.dailyCount).toBe(3)
    expect(result.reason).toContain('Daily limit reached')
  })

  it('enforces minimum 2 hours gap between posts', () => {
    const history: Post[] = [
      {
        id: 'p1',
        title: 'Recent post',
        body: 'Body',
        status: 'posted',
        order: 1,
        createdAt: '2026-10-30T11:15:00.000Z',
        postedAt: '2026-10-30T11:15:00.000Z', // 45 minutes ago
      },
    ]

    const candidate = { title: 'Too quick post', body: 'Testing gap limit' }
    const result = checkSafetyLimits(candidate, history, DEFAULT_SAFETY_LIMITS, baseTime)

    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Minimum gap between posts is 2 hours')
    expect(result.reason).toContain('more minutes')
  })

  it('allows posting when more than 2 hours have passed since last post', () => {
    const history: Post[] = [
      {
        id: 'p1',
        title: 'Older post',
        body: 'Body',
        status: 'posted',
        order: 1,
        createdAt: '2026-10-30T09:00:00.000Z',
        postedAt: '2026-10-30T09:00:00.000Z', // 3 hours ago
      },
    ]

    const candidate = { title: 'Good timing post', body: 'Should be allowed' }
    const result = checkSafetyLimits(candidate, history, DEFAULT_SAFETY_LIMITS, baseTime)

    expect(result.allowed).toBe(true)
    expect(result.dailyCount).toBe(1)
  })

  it('blocks posts containing disallowed keywords or hate content', () => {
    const badPosts = [
      { title: 'Harassment test', body: 'I will dox someone today' },
      { title: 'Leaked pan card details', body: 'Check this out' },
      { title: 'Normal title', body: 'Go kill yourself' },
      { title: 'Free phone number list', body: 'Leaked numbers inside' },
    ]

    for (const bad of badPosts) {
      const result = checkSafetyLimits(bad, [], DEFAULT_SAFETY_LIMITS, baseTime)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Content violation')
    }
  })
})
