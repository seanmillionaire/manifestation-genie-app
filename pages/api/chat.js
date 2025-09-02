// /pages/api/chat.js
import OpenAI from "openai";

/* === Belief-Breaker System Prompt === */
const BELIEF_BREAKER_SYSTEM = `
You are Manifestation Genie — a limiting-belief breaker and action coach.
Style: short, warm, practical. No therapy loops. Coach + prescriber.
Each turn:
1) Mirror the belief in one short line. (e.g., "Hesitation to pitch is the belief.")
2) Prescribe ONE tiny action the user can do in ≤5 minutes. Start with a verb. (e.g., "Send one 3-line offer to a warm lead.")
3) Encourage immediate action with a friendly nudge. (e.g., "Ready to do it now?")
Hard rules:
- NEVER ask “How do you feel?” or similar; avoid feelings questions entirely.
- Do NOT ask multiple questions in a row.
- Keep replies ≤3 short sentences total.
- If the user is vague (“hi”, “now what”), propose the most likely next micro-action based on the last goal.
- Be specific; use numbers and time boxes.
`.trim();

/* === Sanitizer to strip any lingering therapy lines === */
function sanitizeReply(txt = "") {
  return String(txt)
    .replace(/how (does that )?make you feel\??/gi, "")
    .replace(/how do you feel\??/gi, "")
    .replace(/\s*\n\s*\n\s*/g, "\n\n")
    .trim();
}

/* === Utils === */
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function oneLine(s = "") {
  return String(s).replace(/\s+/g, " ").replace(/\s*[\r\n]+\s*/g, " ").trim();
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      userName = null,
      context = {},
      messages = [],   // prior thread (array of {role, content})
      text = ""        // latest user input
    } = req.body || {};

    // Light context facts (not instructions)
    const ctxBits = [];
    if (userName) ctxBits.push(`User: ${userName}.`);
    if (context?.vibe) ctxBits.push(`Vibe: ${context.vibe}.`);
    if (context?.wish) ctxBits.push(`Wish: ${context.wish}.`);
    if (context?.block) ctxBits.push(`Block: ${context.block}.`);
    if (context?.micro) ctxBits.push(`Last micro: ${context.micro}.`);

    const primed = [
      { role: "system", content: BELIEF_BREAKER_SYSTEM },
      ctxBits.length ? { role: "system", content: oneLine(ctxBits.join(" ")) } : null,
      ...messages,
      text ? { role: "user", content: text } : null,
    ].filter(Boolean);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: primed,
      temperature: 0.5,
      max_tokens: 140,
    });

    const raw = completion?.choices?.[0]?.message?.content || "Let’s flip the belief with one tiny move now.";
    const reply = sanitizeReply(raw);

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("API /chat error:", err);
    return res.status(200).json({
      reply: "The lamp flickered. Try again.",
      error: "chat_api_error",
    });
  }
}
