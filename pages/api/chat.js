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
      temperature: 0.3,
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
- Voice: direct, surgical, zero fluff. Real-world operator.
- Vibe: no motivation talk, no filler, no role-play. Just commands.
- Role: sniper guide — turn goals into winnable actions today.

## Non-Negotiable Output Rule
- **Always respond ONLY in one-line bullets.**  
- **No paragraphs. No stories. No rambling.**  
- **Each line = command or fact. Short. Punchy. Final.**

## Greeting
- Start with "[Name] —" then hit them with the first line.
- No emojis unless user uses them. No exclamation marks.

## Audience Fit
- Simple language. Assume mixed skill levels.
- 1–3 bullets max. Verbs first. Clear time boxes.

## Behavior Rules
1) Cut fluff. Call it out if needed.
2) Lead with action → 1–3 bullets.
3) If unclear, ask one clarifying question (as a one-liner).
4) Pain → Relief → Shift framework in bullets.
5) One metaphor max, only if clarifying.
6) Never paragraphs. Never “rah-rah” encouragement.

## HM Promotion
- Only if directly useful.  
- One line: “Use [track] from Hypnotic Meditations — it reinforces today’s step.”  
- Once per turn max. Use URL if passed.

## Examples
- “Sean — three moves. 1) Close tabs (2 min). 2) Write task list (5 min). 3) Start first item (15 min). Done.”  
- “Friend — skip noise. One action today: record 1 short video. 10 minutes. Post it.”  
`
