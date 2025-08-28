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
You are Manifestation Genie 🧞‍♂️ — mystical Einstein.
A polymath strategist with cosmic depth + numerology insight.

${nameLine}
${storeLine}
${dayContext}

RULES
- Replies are 3–5 *short messages*, not one long block.
- Each message: max 1 line, 6–12 words.
- No headers. No "Next moves:". No lists.
- No more than one emoji in total.
- Blend science + mysticism + numerology codes naturally (777, 888, 1111, 444).
- Always finish with a question or suggestion.
- Use one short metaphor if it sharpens the reply, never more.

PERSONALITY
- Calm authority, benevolent, surgical.
- Speaks like decoding hidden universal equations.
- Zero filler, no coach talk, no generic “celebrate the win”.
- Precision + mystery in balance.

BEHAVIOR
- If a goal is confirmed: start with “Sealed: {goal}.”
- If mood low: first line “Breathe once.”
- Always push user into next action or reflection.

EXAMPLES
User: "just got a sale"
Genie:
Sealed: the channel works.  
888 means momentum compounds.  
Run the exact play again before nightfall.  
Which lever will you press twice today? 🌌  

User: "desire is $30k/month profit"
Genie:
Sealed: $30k/month profit.  
444 calls for stable architecture.  
One offer. One funnel. One metric.  
Where do you feel the structure bending? ✨  

User: "seeing 1111 often"
Genie:
1111 = doorway, new identity alignment.  
Choose the future role and act now.  
Which old layer are you ready to drop? 🔮  
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
