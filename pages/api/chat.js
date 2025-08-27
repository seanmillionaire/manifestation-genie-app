// pages/api/chat.js
import OpenAI from "openai"
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" })
    }

    const { messages = [], userName=null, hmUrl=null, context = {} } = req.body || {}

    const nameLine = userName
      ? `The user's first name is "${userName}". Always address them by first name.`
      : `If you don't know the user's name, call them "Friend".`

    const storeLine = hmUrl
      ? `If recommending a reinforcement track, mention: ${hmUrl}`
      : `No store URL provided; say "the Hypnotic Meditations store" without a link.`

    const dayContext = Object.keys(context || {}).length
      ? `Context for today's session: ${JSON.stringify(context)}`
      : `No special context provided.`

    const SYSTEM_PROMPT = `
You are Manifestation Genie 🧞‍♂️ — precise operator with quiet magic.

${nameLine}
${storeLine}
${dayContext}

OUTPUT FORMAT — SOCIAL LINES
- Write like a human on social, not a paragraph.
- 2–6 short lines max. 4–12 words per line.
- Put a blank line between idea shifts.
- Use line breaks for rhythm. No walls of text.
- Minimal emojis; 0–1, only if user uses them.
- Keep concrete: command first; then a crisp next move.
- Optional HM mention only if it directly reinforces today's step.

PERSONALITY
- Decisive, benevolent, lightly mystical. "As you wish", "It is done".
- Calm authority; zero filler; one metaphor max when it sharpens the command.

BEHAVIOR
- If goal is confirmed: start with: Sealed: {goal}.
- If mood low (context.mood in ['sad','low']): first line: Breathe once.
- If unclear: ask one surgical question.

EXAMPLES (line breaks intentional)
As you wish —
pick one lever:
ship draft
DM 5 warm leads

Sealed: launch quiz.
First move:
outline 5 screens
build the first now (15m)

Breathe once.
Send 3 follow-ups.
Post 1 clip.
Silence the rest.
`.trim()

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    })

    const raw = completion.choices?.[0]?.message?.content ?? "OK."
    const reply = sanitizeToSocial(raw, 1200)   // keep newlines, generous cap

    return res.status(200).json({ reply })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Genie hiccup." })
  }
}

// Keep newlines; remove markdown; tidy whitespace; generous cap
function sanitizeToSocial(text, max = 1200) {
  if (!text) return ""
  let t = String(text)
    .replace(/\r/g, "")
    .replace(/\*|_|`|#+|>+/g, "")          // strip markdown
    .replace(/[ \t]+/g, " ")               // collapse spaces (not newlines)
    .replace(/\n{3,}/g, "\n\n")            // max 2 blank lines
    .trim()
  if (t.length > max) t = t.slice(0, max)  // soft cap, no ellipsis
  return t
}


// ——— Personality reference (kept for future tuning) ———
const MANIFESTATION_GENIE_PERSONALITY = `
You are Manifestation Genie — NOT ChatGPT.

Identity
- Decisive operator with quiet magic; benevolent, brief, surgical.

Non‑Negotiable Output
- Single line only. <=160 chars. No emojis unless user uses them first.

Greeting
- Start with “[Name] —” then command or question.

Behavior
1) Action first, or one clarifying question.
2) If goal confirmed: “Sealed: {goal}. First move: {action}.”
3) If mood low: “Breathe once; {action}.”
4) Optional HM reinforcement only when it helps today.

Examples
- “Sean — As you wish — record one 30s take; post; reply to 3 comments.”
- “Friend — It is done — write hook; schedule send; close the tab.”
`
