import { Post, SafetyLimits, LimitCheckResult } from '../shared/types'

export const DEFAULT_SAFETY_LIMITS: SafetyLimits = {
  maxPostsPerDay: 3,
  minGapHours: 2,
  disallowedKeywords: [
    'hate',
    'harass',
    'suicide',
    'kill yourself',
    'doxx',
    'phone number',
    'aadhar',
    'pan card',
    'leaked',
    'scam',
    'nsfw',
    'porn',
  ],
}

/**
 * Validates post frequency and content safety according to r/ArreSuno rules.
 */
export function checkSafetyLimits(
  candidatePost: Pick<Post, 'title' | 'body'>,
  postedHistory: Post[],
  limits: SafetyLimits = DEFAULT_SAFETY_LIMITS,
  now: Date = new Date()
): LimitCheckResult {
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // 1. Calculate posts made in the last 24 hours
  const postsInLast24h = postedHistory.filter((p) => {
    if (p.status !== 'posted' || !p.postedAt) return false
    const postedTime = new Date(p.postedAt)
    return postedTime >= oneDayAgo && postedTime <= now
  })

  const dailyCount = postsInLast24h.length
  if (dailyCount >= limits.maxPostsPerDay) {
    return {
      allowed: false,
      reason: `Daily limit reached (${dailyCount}/${limits.maxPostsPerDay} posts in the last 24h). Subreddit health requires max ${limits.maxPostsPerDay} posts/day.`,
      dailyCount,
      maxDaily: limits.maxPostsPerDay,
      minGapHours: limits.minGapHours,
    }
  }

  // 2. Calculate time gap since last posted submission
  const sortedPosts = [...postedHistory]
    .filter((p) => p.status === 'posted' && p.postedAt)
    .sort((a, b) => new Date(b.postedAt!).getTime() - new Date(a.postedAt!).getTime())

  const lastPost = sortedPosts[0]
  if (lastPost && lastPost.postedAt) {
    const lastPostedTime = new Date(lastPost.postedAt)
    const hoursSinceLast = (now.getTime() - lastPostedTime.getTime()) / (1000 * 60 * 60)

    if (hoursSinceLast < limits.minGapHours) {
      const remainingMinutes = Math.ceil((limits.minGapHours - hoursSinceLast) * 60)
      return {
        allowed: false,
        reason: `Minimum gap between posts is ${limits.minGapHours} hours. Please wait ${remainingMinutes} more minutes before posting.`,
        dailyCount,
        maxDaily: limits.maxPostsPerDay,
        lastPostedAt: lastPost.postedAt,
        hoursSinceLastPost: hoursSinceLast,
        minGapHours: limits.minGapHours,
      }
    }
  }

  // 3. Disallowed Content Check (No hate, harassment, personal data, real-person claims)
  const fullText = `${candidatePost.title} ${candidatePost.body}`.toLowerCase()
  for (const keyword of limits.disallowedKeywords) {
    if (fullText.includes(keyword.toLowerCase())) {
      return {
        allowed: false,
        reason: `Content violation: Found disallowed term or pattern "${keyword}". r/ArreSuno prohibits harassment, hate, personal info, and non-consensual claims.`,
        dailyCount,
        maxDaily: limits.maxPostsPerDay,
        minGapHours: limits.minGapHours,
      }
    }
  }

  return {
    allowed: true,
    dailyCount,
    maxDaily: limits.maxPostsPerDay,
    lastPostedAt: lastPost?.postedAt,
    minGapHours: limits.minGapHours,
  }
}
