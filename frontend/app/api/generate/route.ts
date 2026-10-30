import { NextResponse } from "next/server"
import { getDashboardState, saveDashboardState } from "@/lib/storage"
import { PostCategory, QueuePost } from "@/lib/types"

const DEFAULT_API_KEY = process.env.GEMINI_API_KEY || ""
const MODELS = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"]

const CATEGORY_PROMPTS: Record<PostCategory, string> = {
  relatable_life: "Share a funny, relatable everyday observation about Indian life (e.g., auto drivers rejecting rides, bargaining skills, metro/local train struggles, chai addiction, office corporate jargon vs reality).",
  question: "Ask a witty or intriguing question that gets people sharing funny stories or personal takes (e.g., weirdest superstition you believed, unwritten rules of Indian households, strange habits).",
  harmless_confession: "Share a lighthearted, innocent confession or funny habit and ask if anyone else is guilty of doing this too.",
  casual_rant: "Share a humorous, non-toxic rant about daily mild frustrations (e.g., 10-minute grocery apps delivering wrong items, endless wedding season invites, family WhatsApp forward sagas).",
}

export async function POST(req: Request) {
  try {
    const { category = "relatable_life", accountId } = await req.json().catch(() => ({}))
    const state = getDashboardState()

    const chosenAccount =
      state.accounts.find((a) => a.id === accountId && a.isActive) ||
      state.accounts.find((a) => a.isActive) ||
      state.accounts[0]

    // Rotate schedule time: schedule 2 hours after the latest queued post
    const lastPost = state.posts
      .filter((p) => p.status === "queued")
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0]

    const baseTime = lastPost ? new Date(lastPost.scheduledAt).getTime() : Date.now()
    const scheduledTime = new Date(baseTime + 1000 * 60 * 120).toISOString() // +2 hours

    const promptText = `Write one Reddit self-post for r/ArreSuno.

Subreddit description:
ArreSuno is a Hinglish-first community for Indians to share relatable thoughts, funny observations, confessions, and everyday life banter. Think of it as sitting with friends at a chai tapri and saying, "Arre suno...".

Category: ${category}
${CATEGORY_PROMPTS[category as PostCategory] || ""}

Writing rules:
- Write like an actual human Reddit user typing casually from their phone. No corporate or robotic speak.
- STRICTLY ZERO AI SLOP: Absolutely forbidden to use AI clichés like "delve into", "a testament to", "in a world where", "it compounds over time", "furthermore", "vital", "at the end of the day", or generic LinkedIn productivity advice.
- Natural conversational tone: use everyday natural Indian expressions, light humor, witty observations, and natural Hinglish (words like 'yaar', 'bhai', 'scene', 'jugaad', 'arrey' when natural).
- Keep paragraphs short and conversational.
- Discussion-oriented: end with an engaging, casual open question that makes fellow community members want to comment and share their own stories.
- Output ONLY valid JSON with keys "title" and "body". No markdown wrap, no backticks.
{"title": "...", "body": "..."}`

    let generated: { title: string; body: string } | null = null
    let lastError = ""

    for (const model of MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${DEFAULT_API_KEY}`
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
          }),
        })

        if (!res.ok) {
          const errText = await res.text()
          lastError = `${model}: ${errText}`
          continue
        }

        const data = await res.json()
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
        const cleaned = rawText.replace(/```(?:json)?/g, "").replace(/```/g, "").trim()
        const parsed = JSON.parse(cleaned)
        if (parsed.title && parsed.body) {
          generated = parsed
          break
        }
      } catch (e: any) {
        lastError = e.message
      }
    }

    if (!generated) {
      // Graceful high-quality fallback if Gemini is offline
      generated = {
        title: "The unwritten rule of Indian households when someone asks 'khana khaya?'",
        body: "Arre suno, you can never just say 'nahi' without triggering a 4-course emergency meal operation. Even if you just had a pizza 10 minutes ago, mom will look at you with deep concern and say 'thoda sa dal chawal le le'. What is that one dialogue in your house that you hear every single day without fail?",
      }
    }

    const newPost: QueuePost = {
      id: "post_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      title: generated.title,
      body: generated.body,
      category: category as PostCategory,
      accountId: chosenAccount.id,
      scheduledAt: scheduledTime,
      status: "queued",
      order: state.posts.length + 1,
      createdAt: new Date().toISOString(),
    }

    state.posts.push(newPost)
    saveDashboardState(state)

    return NextResponse.json({ success: true, post: newPost })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
