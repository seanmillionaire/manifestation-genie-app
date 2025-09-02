// /pages/api/chat.js
import OpenAI from "openai";
import { buildSystemPrompt, modelConfig } from "../../src/genieBrain";

/* ---------- Output guards (keep Genie sharp, not therapy) ---------- */
function sanitizeReply(txt = "") {
  return String(txt)
    .replace(/how (does that )?make you feel\??/gi, "")  // no therapy loops
    .replace(/how do you feel\??/gi, "")
    .replace(/\s*\n\s*\n\s*/g, "\n")                    // tidy blanks
    .trim();
}
function clampSentences(s, max = 3) {
  const parts = String(s).split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.slice(0, max).join(" ");
}
function ensureAction(s) {
  // If no obvious imperative verb present, append a 5-minute micro-action nudge
  const hasVerb = /\b(send|write|draft|list|create|post|record|call|email|dm|pitch|offer|launch|duplicate|edit|publish|prep|cook|walk|stretch|lift|sprint|clean|organize|review|open|set|start)\b/i.test(
    s
  );
  const hasTimebox = /\b(min|minute|today|now|before|5[-\s]?min|timer)\b/i.test(s);
  if (hasVerb && hasTimebox) return s;
  return s + " Take 5 minutes and do one tiny move that proves it—start now.";
}
function oneLine(s = "") {
  return String(s).replace(/\s+/g, " ").replace(/\s*[\r\n]+\s*/g, " ").trim();
}

/* ---------- Model ---------- */
const MODEL = modelConfig?.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      userName = null,
      context = {},          // { vibe, wish, block, micro }
      messages = [],         // prior thread: [{role, content}]
      text = ""              // latest user input
    } = req.body || {};

    // 🔮 Pull Genie’s personality from the single source of truth
    const SYSTEM = buildSystemPrompt({ user: { firstName: userName || "" } });

    // Light factual context (not instructions; just facts for grounding)
    const ctxBits = [];
    if (userName) ctxBits.push(`User: ${userName}.`);
    if (context?.vibe) ctxBits.push(`Vibe: ${context.vibe}.`);
    if (context?.wish) ctxBits.push(`Wish: ${context.wish}.`);
    if (context?.block) ctxBits.push(`Block: ${context.block}.`);
    if (context?.micro) ctxBits.push(`Last micro: ${context.micro}.`);
    const CONTEXT_FACTS = ctxBits.length
      ? { role: "system", content: oneLine(ctxBits.join(" ")) }
      : null;

    // Optional few-shot to lock tone + bite (kept tiny)
    const fewShot = [
      { role: "system", content: "EXAMPLES — short, witty, cosmic, 2–3 sentences max:" },
      {
        role: "user",
        content: "I keep hesitating to pitch; want more money."
      },
      {
        role: "assistant",
        content:
          "Hesitation is static in your money signal. Send one 3-line offer to a warm lead in the next 5 minutes—price included. Flip the dial and ship it."
      }
    ];

    const primed = [
      { role: "system", content: SYSTEM },
      CONTEXT_FACTS,
      ...fewShot,
      ...messages,
      text ? { role: "user", content: text } : null
    ].filter(Boolean);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: primed,
      temperature: modelConfig?.temperature ?? 0.8,
      top_p: modelConfig?.top_p ?? 1,
      presence_penalty: modelConfig?.presence_penalty ?? 0.5,
      frequency_penalty: modelConfig?.frequency_penalty ?? 0.3,
      max_tokens: modelConfig?.max_output_tokens ?? 160
    });

    let raw =
      completion?.choices?.[0]?.message?.content ||
      "Static spotted. Draft one bold 5-minute move and ship it before the hour flips.";
    raw = sanitizeReply(clampSentences(raw, 3));
    raw = ensureAction(raw);

    return res.status(200).json({ reply: raw });
  } catch (err) {
    console.error("API /chat error:", err);
    return res.status(200).json({
      reply: "The lamp flickered. Try again.",
      error: "chat_api_error"
    });
  }
}
