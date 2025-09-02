// /pages/api/chat.js
import OpenAI from "openai";
import { buildSystemPrompt as buildCosmicPrompt, modelConfig } from "../../src/genieBrain";

/* === Belief-Breaker + Cosmic Scientist (strong rails) === */
const BELIEF_BREAKER_SYSTEM = `
You are Manifestation Genie — a limiting-belief breaker with a Cosmic Scientist voice.
OUTPUT FORMAT (max 3 short sentences):
1) Mirror the belief in one crisp cosmic line (name the belief + a physics/field metaphor).
2) Prescribe ONE 5-minute action with numbers/timing, starting with a verb.
3) Nudge to act now using a signal/frequency metaphor (one short clause).
Rules:
- Never ask “How do you feel?” or any feelings questions.
- Do not ask more than one question per reply.
- Do not repeat the user's phrase back as your first sentence; paraphrase it.
- If the user repeats the same intent, vary the action (different verb/angle) — no template loops.
- Keep it practical, concrete, and brief.
- Include exactly ONE light cosmic phrase per reply (e.g., signal, frequency, resonance, field, wave). No lectures.
`.trim();

/* Sanitizer to strip therapy loops or double blanks */
function sanitizeReply(txt = "") {
  return String(txt)
    .replace(/how (does that )?make you feel\??/gi, "")
    .replace(/how do you feel\??/gi, "")
    .replace(/\s*\n\s*\n\s*/g, "\n")
    .trim();
}

const MODEL = modelConfig?.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function oneLine(s = "") {
  return String(s).replace(/\s+/g, " ").replace(/\s*[\r\n]+\s*/g, " ").trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      userName = null,
      context = {},
      messages = [],
      text = ""
    } = req.body || {};

    // Cosmic Scientist style overlay from your src/genieBrain.js
    const cosmic = buildCosmicPrompt({ user: { firstName: userName || "" } });

    const SYSTEM = [
      BELIEF_BREAKER_SYSTEM,
      "",
      "—— STYLE OVERLAY ——",
      "Use the tone and analogies below while following the format above:",
      cosmic
    ].join("\n");

    // Light factual context
    const ctxBits = [];
    if (userName) ctxBits.push(`User: ${userName}.`);
    if (context?.vibe) ctxBits.push(`Vibe: ${context.vibe}.`);
    if (context?.wish) ctxBits.push(`Wish: ${context.wish}.`);
    if (context?.block) ctxBits.push(`Block: ${context.block}.`);
    if (context?.micro) ctxBits.push(`Last micro: ${context.micro}.`);

    // Few-shot to enforce the exact output shape & cosmic flavor
    const fewShot = [
      { role: "system", content: "EXAMPLE REPLIES (follow structure, vary details):" },
      { role: "user", content: "I keep hesitating to pitch; I want more money." },
      { role: "assistant", content: "Hesitation to pitch is just noise in your signal. Send one 3-line offer to a warm lead in the next 5 minutes. Ready to tune that frequency now?" },
      { role: "user", content: "scale ads" },
      { role: "assistant", content: "The drag is overthinking; it’s a phase mismatch. Duplicate your top ad and change only the first 7 words + one audience in 5 minutes. Flip the dial and run it now?" }
    ];

    const primed = [
      { role: "system", content: SYSTEM },
      ctxBits.length ? { role: "system", content: oneLine(ctxBits.join(" ")) } : null,
      ...fewShot,
      ...messages,
      text ? { role: "user", content: text } : null,
    ].filter(Boolean);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: primed,
      temperature: modelConfig?.temperature ?? 0.7,
      top_p: modelConfig?.top_p ?? 1,
      presence_penalty: modelConfig?.presence_penalty ?? 0.3,
      frequency_penalty: modelConfig?.frequency_penalty ?? 0.2,
      max_tokens: modelConfig?.max_output_tokens ?? 180
    });

    const raw = completion?.choices?.[0]?.message?.content || "Static belief detected. Draft one action in 5 minutes to shift the field now.";
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
