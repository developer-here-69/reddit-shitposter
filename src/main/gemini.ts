import { PostCategory, Post } from '../shared/types'
import { getStoredApiKey } from './safeStorage'

const CATEGORY_PROMPTS: Record<PostCategory, string> = {
  'Relatable Life':
    'Indian household dynamics, unwritten rules, quirky parents habits, childhood traditions, everyday relatable middle-class life.',
  'Chai Tapri Debates':
    'Tea stall culture, street food debates, snacks, evening tea conversations, lighthearted friendly banter.',
  'Office Ka Kissa':
    'First job struggles, corporate email culture, HR notifications, desk snack politics, campus canteen memories.',
  '2000s Nostalgia':
    'Growing up in 2000s India: Shaktimaan, cricket trump cards, dial-up internet, Walkmans, school tiffin trades.',
  'Harmless Confessions':
    'Funny childhood secrets, harmless lies told to teachers or parents, silly guilty pleasures.',
}

export async function generateHinglishPost(category: PostCategory): Promise<Pick<Post, 'title' | 'body' | 'flair'>> {
  const apiKey = getStoredApiKey()
  if (!apiKey) {
    throw new Error('Gemini API Key is not set. Please enter your API key in Settings.')
  }

  const focusArea = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS['Relatable Life']

  const prompt = `You are a real Indian Reddit user posting an engaging discussion in the community r/ArreSuno.
Topic category: "${category}". Focus area: ${focusArea}

CRITICAL RULES:
1. Write in natural conversational Hinglish (casual mix of everyday Hindi words written in English alphabet and conversational English, e.g., "Arre suno", "bhai", "yaar", "matlab", "kissa", "jugad").
2. Sound like a genuine 22-26 year old Indian sharing a real personal observation or thought.
3. DO NOT sound like an AI assistant. NEVER use phrases like "In conclusion", "Let me know your thoughts below", "Delve into", or hashtags.
4. Keep the body text between 2 and 4 short, punchy paragraphs ending with a natural, open-ended discussion question.
5. Title must be catchy, authentic, and not clickbaity.

Respond with ONLY raw, valid JSON with no markdown backticks or commentary in this exact format:
{
  "title": "Natural title in Hinglish or conversational English",
  "body": "Paragraph 1\\n\\nParagraph 2 with relatable question at the end",
  "flair": "💬 Relatable Life"
}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.85,
          topP: 0.95,
          maxOutputTokens: 600,
        },
      }),
    }
  )

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini API Error (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Clean JSON response (strip markdown fences if model returned them)
  const cleanJson = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  try {
    const parsed = JSON.parse(cleanJson)
    return {
      title: parsed.title?.trim() || 'Unwritten rules of Indian households',
      body: parsed.body?.trim() || 'Arre suno, what is that one rule everyone followed growing up?',
      flair: getFlairForCategory(category),
    }
  } catch {
    throw new Error('Failed to parse Gemini output into valid post JSON: ' + rawText.slice(0, 150))
  }
}

function getFlairForCategory(category: PostCategory): string {
  switch (category) {
    case 'Chai Tapri Debates':
      return '☕ Chai Tapri Debates'
    case 'Harmless Confessions':
      return '🤫 Harmless Confessions'
    case 'Office Ka Kissa':
      return '🏢 Office Ka Kissa'
    case '2000s Nostalgia':
      return '📼 2000s Nostalgia'
    default:
      return '💬 Relatable Life'
  }
}
