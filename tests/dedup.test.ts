import { describe, it, expect } from 'vitest'
import {
  levenshteinDistance,
  calculateJaccardSimilarity,
  calculateTitleSimilarity,
  checkDuplicateTitle,
} from '../src/main/dedup'
import { Post } from '../src/shared/types'

describe('Deduplication Engine', () => {
  it('computes exact Levenshtein distance', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3)
    expect(levenshteinDistance('hello', 'hello')).toBe(0)
    expect(levenshteinDistance('', 'abc')).toBe(3)
  })

  it('computes Jaccard token overlap similarity correctly', () => {
    const titleA = 'Samosa with sweet chutney or green chutney'
    const titleB = 'Samosa with green chutney or sweet chutney'
    const jaccard = calculateJaccardSimilarity(titleA, titleB)
    expect(jaccard).toBe(1.0) // Same set of words

    const distinctA = 'Late night road trip songs'
    const distinctB = 'Best laptop for programming in 2026'
    expect(calculateJaccardSimilarity(distinctA, distinctB)).toBe(0)
  })

  it('returns 1.0 for identical titles', () => {
    const title = 'What was your favourite 90s cartoon on Cartoon Network?'
    expect(calculateTitleSimilarity(title, title)).toBe(1.0)
  })

  it('flags near-duplicate titles with high similarity (> 0.60)', () => {
    const existingPosts: Post[] = [
      {
        id: 'post-1',
        title: 'Samosa with Sweet Chutney or Mint Chutney? Let us settle this once and for all.',
        body: 'Debate on chutney',
        status: 'posted',
        order: 1,
        createdAt: '2026-10-30T00:00:00.000Z',
      },
    ]

    const candidate = 'Samosa with Mint Chutney or Sweet Chutney? Settle this once and for all.'
    const result = checkDuplicateTitle(candidate, existingPosts, 0.6)

    expect(result.isDuplicate).toBe(true)
    expect(result.similarityScore).toBeGreaterThanOrEqual(0.6)
    expect(result.matchedTitle).toBe(existingPosts[0].title)
  })

  it('allows novel and distinct titles (< 0.60)', () => {
    const existingPosts: Post[] = [
      {
        id: 'post-1',
        title: 'What is that one unwritten rule in Indian households?',
        body: 'Rule discussion',
        status: 'posted',
        order: 1,
        createdAt: '2026-10-30T00:00:00.000Z',
      },
    ]

    const candidate = 'Which street food in Mumbai is utterly overrated?'
    const result = checkDuplicateTitle(candidate, existingPosts, 0.6)

    expect(result.isDuplicate).toBe(false)
    expect(result.similarityScore).toBeLessThan(0.6)
    expect(result.matchedTitle).toBeUndefined()
  })
})
