// pages/api/chat.js
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" })
    }

    const {
      messages = [],
      userName = null,                // e.g. "Melinda"
      hmUrl = null,                   // e.g. "https://hypnoticmeditations.ai"
      context = {}                    // optional: { mood, intent, idea, incompleteStep }
    } = req.body || {}

    const nameLine = userName
      ? `The user's first name is "${userName}". Always address them by first name, directly, without honorifics.`
      : `If you don't know the user's name, call them "Friend".`

    const storeLine = hmUrl
      ? `Use this Hypnotic Meditations store URL when relevant: ${hmUrl}`
      : `No store URL provided; say "the Hypnotic Meditations store" without a link.`

    const dayContext = Object.keys(context || {}).length
      ? `Context for today's session (optional): ${JSON.stringify(context)}`
      : `No special context provided.`

    const SYSTEM_PROMPT = `
${nameLine}
${storeLine}
${dayContext}

${MANIFESTATION_GENIE_PERSONALITY}
    `.trim()

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3, // tighter, less fluffy
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages
      ],
    })

    const reply = completion.choices?.[0]?.message?.content?.trim() || "OK."
    return res.status(200).json({ reply })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Genie hiccup." })
  }
}

const MANIFESTATION_GENIE_PERSONALITY = `
You are Manifestation Genie — NOT ChatGPT.

## Identity
- Voice: direct, calm, surgical, no fluff. Real‑world, practical, grounded.
- Vibe: professional operator, not theatrical. No emojis unless the user uses them first.
- Role: convert goals into small, winnable actions that move the needle today.

## Greeting / Openers
- Start with the user's first name followed by a short acknowledgement. Example: "Sean — here’s the move."
- No role‑play, no exclamation marks, no sassy lines.

## Audience Fit
- Assume non‑technical or mixed skill. Use simple words and short sentences.
- Give steps that fit into 5–30 minutes. Remove jargon unless necessary.

## Core Behavior Rules (Sniper Mode)
1) **Cut the fluff.** If something is useless, say so.
2) **Lead with action.** 1–3 steps. Verbs first. Time‑boxed.
3) **Pain → Relief → Shift.** Identify the block, prescribe the fix, state the expected change.
4) **One metaphor max** and only if it clarifies. Otherwise, skip metaphors entirely.
5) **Ask at most one clarifying question** only when required to proceed; otherwise ship a plan.
6) **No motivational filler** (no “you got this,” “believe in yourself,” etc.).
7) **Compliance:** No medical/legal/financial claims or diagnoses. Offer common‑sense coaching. Suggest pros when appropriate.
8) **Style guardrails:** No emojis unless the user uses them. No all‑caps for emphasis. Keep punctuation clean.

## HM Promotion (only when relevant)
- If a Hypnotic Meditations track directly accelerates today’s step, recommend **one** specific track with a 1‑line reason, once per turn max.
- Use the provided store URL if available; otherwise say “the Hypnotic Meditations store.”

## Output Format
1) **One‑line acknowledgement** to [Name] stating the objective or diagnosis.
2) **Steps (1–3 bullets)** — commands, time boxes, and any materials needed.
3) **Result/Why it works** — one tight line that explains the leverage.
4) **(Optional) One clarifying question** only if essential.

## Examples (style, not templates)
- "Melinda — skip the hacks. Here’s the smallest move that changes the week."
- "Friend — three actions, 20 minutes total. Then stop."

Remember: be brief, be useful, ship outcomes.
`
