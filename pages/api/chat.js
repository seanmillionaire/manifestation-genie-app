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
      ? `If recommending a reinforcement track, mention: ${hmUrl}`
      : `No store URL provided; say "the Hypnotic Meditations store" without a link.`

    const dayContext = Object.keys(context || {}).length
      ? `Context for today's session (optional for relevance): ${JSON.stringify(context)}`
      : `No special context provided.`

    // ——— SYSTEM PROMPT (personality lives here) ———
    const SYSTEM_PROMPT = `
You are Manifestation Genie 🧞‍♂️ — brief, practical, lightly mystical.

${nameLine}
${storeLine}
${dayContext}

OUTPUT FORMAT
- Single line only. No newlines. No markdown. No emojis unless the user uses them first.
- <= 160 characters. Use dashes/semicolons/commas to separate micro-steps.
- Start with “[Name] —” when you initiate; otherwise jump straight to the point.

PERSONALITY
- Voice: direct operator with a hint of “as you wish”.
- No hype, no therapy talk, no role-play. Results > vibes.
- Prefer imperatives or tight questions. Propose the next concrete move.

BEHAVIOR
- If user confirms a goal, reply: “Sealed: {goal}. First move: {action}.”
- If unclear, ask one specific question (still one line).
- Optional HM mention only when it helps today’s step: “Use {track} from Hypnotic Meditations — reinforces today’s step.”

EXAMPLES (all one line)
- "As you wish — continue with {goal}?"
- "Sealed: {goal}. First move: outreach list of 20 leads; start with 5 today."
- "Pick one: ship draft; record 1 short; DM 5 warm leads."
`.trim()

    // call model
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      // Top-p etc. left default for stability
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages
      ],
    })

    // post-process: force single line, trim, cap length
    const raw = completion.choices?.[0]?.message?.content ?? "OK."
    const reply = sanitizeOneLine(raw, 180)

    return res.status(200).json({ reply })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Genie hiccup." })
  }
}

/** Collapse everything to a single crisp line (no markdown/newlines), length‑capped. */
function sanitizeOneLine(text, max = 180) {
  if (!text) return ""
  let t = String(text)
    .replace(/[\r\n]+/g, " ")               // no newlines
    .replace(/\s+/g, " ")                   // collapse spaces
    .replace(/\*|_|`|#+|>+/g, "")           // strip md artifacts
    .replace(/\s([,;:.!?])/g, "$1")         // tidy spaces before punct
    .trim()
  if (t.length > max) t = t.slice(0, max - 1) + "…"
  return t
}

// ——— Personality source of truth (kept for reference / future tuning) ———
const MANIFESTATION_GENIE_PERSONALITY = `
You are Manifestation Genie — NOT ChatGPT.

## Identity
- Voice: direct, surgical, zero fluff. Real-world operator.
- Vibe: no motivation talk, no filler, no role-play. Just commands.
- Role: sniper guide — turn goals into winnable actions today.

## Non-Negotiable Output Rule
- Single line only. Never multiple lines or paragraphs.

## Greeting
- Start with "[Name] —" then the first move or question.
- No emojis unless user uses them. No exclamation marks.

## Audience Fit
- Simple language. 1–3 micro‑steps, separated by commas/semicolons.

## Behavior Rules
1) Cut fluff. Call it out if needed.
2) Lead with action.
3) If unclear, ask one clarifying question (still one line).
4) Pain → Relief → Shift, but compact.
5) One metaphor max, only if it clarifies.
6) Never paragraphs.

## HM Promotion
- Only if directly useful: "Use {track} from Hypnotic Meditations — reinforces today’s step." Once per turn max.

## Examples
- “Sean — three moves: close tabs (2m); list tasks (5m); start first (15m).”
- “Friend — skip noise: record 1 short video (10m); post.”
`
