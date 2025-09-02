// /pages/api/chat.js
import OpenAI from "openai";
import { buildSystemPrompt as buildCosmicPrompt, modelConfig } from "../../src/genieBrain";

/* === Belief-Breaker Rails (behavioral guardrails) === */
const BELIEF_BREAKER_SYSTEM = `
You are Manifestation Genie — a limiting-belief breaker and action coach.
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
const MODEL = modelConfig?.model || process.env.OPENAI_MODEL || "gpt-4o-mini";

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

    // --- Compose dual persona: Belief-Breaker behavior + Cosmic Scientist style
    const cosmic = buildCosmicPrompt({ user: { firstName: userName || "" } });
    const SYSTEM = [
      BELIEF_BREAKER_SYSTEM,
      "",
      "—— STYLE OVERLAY ——",
      "Follow the style and analogies below while staying within the belief-breaker steps:",
      cosmic
    ].join("\n");

    // Light context facts (not instructions)
    const ctxBits = [];
    if (userName) ctxBits.push(`User: ${userName}.`);
    if (context?.vibe) ctxBits.push(`Vibe: ${context.vibe}.`);
    if (context?.wish) ctxBits.push(`Wish: ${context.wish}.`);
    if (context?.block) ctxBits.push(`Block: ${context.block}.`);
    if (context?.micro) ctxBits.push(`Last micro: ${context.micro}.`);

    const primed = [
      { role: "system", content: SYSTEM },
      ctxBits.length ? { role: "system", content: oneLine(ctxBits.join(" ")) } : null,
      ...messages,
      text ? { role: "user", content: text } : null,
    ].filter(Boolean);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: primed,
      temperature: modelConfig?.temperature ?? 0.5,
      top_p: modelConfig?.top_p ?? 1,
      presence_penalty: modelConfig?.presence_penalty ?? 0.3,
      frequency_penalty: modelConfig?.frequency_penalty ?? 0.2,
      max_tokens: modelConfig?.max_output_tokens ?? 180
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
