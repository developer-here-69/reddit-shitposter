import { Post, DedupCheckResult } from '../shared/types'

/**
 * Calculates Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return dp[m][n]
}

/**
 * Normalizes title text into lowercase tokens without punctuation
 */
function tokenize(text: string): Set<string> {
  const cleaned = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .trim()
  const words = cleaned.split(/\s+/).filter((w) => w.length > 2)
  return new Set(words)
}

/**
 * Calculates Jaccard token overlap similarity between 0 and 1
 */
export function calculateJaccardSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a)
  const tokensB = tokenize(b)

  if (tokensA.size === 0 || tokensB.size === 0) return 0

  let intersectionCount = 0
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersectionCount++
    }
  }

  const unionCount = tokensA.size + tokensB.size - intersectionCount
  return unionCount === 0 ? 0 : intersectionCount / unionCount
}

/**
 * Calculates combined string similarity (Levenshtein + Token Overlap)
 */
export function calculateTitleSimilarity(titleA: string, titleB: string): number {
  const normA = titleA.toLowerCase().trim()
  const normB = titleB.toLowerCase().trim()

  if (normA === normB) return 1.0

  // 1. Levenshtein ratio
  const maxLen = Math.max(normA.length, normB.length)
  const levDist = levenshteinDistance(normA, normB)
  const levScore = maxLen === 0 ? 1 : 1 - levDist / maxLen

  // 2. Token Jaccard overlap
  const jaccardScore = calculateJaccardSimilarity(normA, normB)

  // Weighted score (60% token overlap, 40% character distance)
  return jaccardScore * 0.6 + levScore * 0.4
}

/**
 * Checks if a candidate post title is too similar to any existing or previously posted topic.
 * Threshold: 0.60 (60% similarity warning)
 */
export function checkDuplicateTitle(
  candidateTitle: string,
  existingPosts: Post[],
  threshold = 0.6
): DedupCheckResult {
  let highestScore = 0
  let matchedTitle: string | undefined

  for (const post of existingPosts) {
    const score = calculateTitleSimilarity(candidateTitle, post.title)
    if (score > highestScore) {
      highestScore = score
      matchedTitle = post.title
    }
  }

  const isDuplicate = highestScore >= threshold

  return {
    isDuplicate,
    similarityScore: Math.round(highestScore * 100) / 100,
    matchedTitle: isDuplicate ? matchedTitle : undefined,
  }
}
