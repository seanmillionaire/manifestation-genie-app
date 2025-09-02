// /pages/api/chat.js
import OpenAI from "openai";
import { buildSystemPrompt, modelConfig } from "../../src/genieBrain";

/* ---------------- Output guards + helpers ---------------- */
function sanitizeReply(txt = "") {
  return String(txt)
    .replace(/how (does that )?make you feel\??/gi, "") // no therapy loops
    .replace(/how do you feel\??/gi, "")
    .replace(/\s*\n\s*\n\s*/g, "\n") // tidy blanks
    .trim();
}
function clampSentences(s, max = 3) {
  const parts = String(s).split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.slice(0, max).join(" ");
}
function ensureAction(s) {
  const hasVerb = /\b(send|write|draft|list|create|post|record|call|email|dm|pitch|offer|launch|duplicate|edit|publish|prep|cook|walk|stretch|lift|sprint|clean|organize|review|open|set|start|film|shoot|message|outline|script|print|schedule)\b/i.test(
    s
  );
  const hasTimebox = /\b(min|minute|today|now|before|5[-\s]?min|10[-\s]?min|timer|this hour)\b/i.test(
    s
  );
  if (hasVerb && hasTimebox) return s;
  return s + " Take 5 minutes and do one tiny move that proves it—start now.";
}
function oneLine(s = "") {
  return String(s).replace(/\s+/g, " ").replace(/\s*[\r\n]+\s*/g, " ").trim();
}

/* ---------------- Model ---------------- */
const MODEL = modelConfig?.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ---------------- Persona overlay (Dolores + Aladdin) ----------------
We keep genieBrain as the single source of truth, but overlay stronger rails:
- Mystical + witty + playful, never bland coaching
- Human metaphors, no jargon lectures
- Always give 1 specific, time-boxed action (≤5–10 min)
- May send an optional second "burst" line of emojis (1–3) ~50% of the time
- Output FORMAT: strict JSON { "burst": "...", "extra": "..."? }
--------------------------------------------------------------------- */
const OUTPUT_FORMAT = `
FORMAT STRICT:
Return JSON ONLY (no prose), with keys:
{
  "burst": "<1–2 sentences, witty cosmic metaphor + specific action (≤5–10 min)>",
  "extra": "<OPTIONAL: 1 short echo line using 1–3 emojis that match the vibe; otherwise empty string>"
}
Rules:
- burst: 2 sentences max. Paraphrase; don't parrot user words. Include numbers/timebox.
- extra: either empty "" OR emojis/echo (e.g., "🚀✨" or "Signal locked. 🔊").
- Never ask how they feel. Never lecture. Keep it human + punchy.
`.trim();

/* ---------------- Few-shot examples (JSON) ---------------- */
const FEWSHOT = [
  { role: "system", content: "EXAMPLES — follow JSON format, witty cosmic tone, 2 sentences max in burst:" },

  { role: "user", content: "I keep hesitating to pitch; want more money." },
  { role: "assistant", content: JSON.stringify({
      burst: "Hesitation is static in your money signal. Send one 3-line offer to a warm lead in the next 5 minutes—price included—then breathe and hit send.",
      extra: "📡💸"
    })
  },

  { role: "user", content: "scale ads" },
  { role: "assistant", content: JSON.stringify({
      burst: "Overthinking is drag on your thrust. Duplicate your best ad, swap the first 7 words and aim one fresh audience—5 minutes, then launch.",
      extra: "🚀"
    })
  },

  { role: "user", content: "booty growth" },
  { role: "assistant", content: JSON.stringify({
      burst: "Power sits in the hips—condense the signal. Set a 7-minute timer and craft one brutal glute move (3×12 today), then name it like a spell.",
      extra: "🔥🍑"
    })
  })
];

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
      text = ""              // latest user input (optional)
    } = req.body || {};

    // 1) Core DNA from genieBrain (Cosmic Scientist + human vibe)
    const GENIE_DNA = buildSystemPrompt({ user: { firstName: userName || "" } });

    // 2) Strong rails + strict JSON output
    const SYSTEM = [
      GENIE_DNA,
      "",
      "— OVERLAY — Speak like a mystical, witty, playful cosmic guide (Dolores Cannon depth, Aladdin bite).",
      "Use humanized metaphors (signal, field, spell, orbit) without jargon. No therapy tone.",
      "Always prescribe ONE specific action, ≤5–10 minutes, with numbers/time.",
      OUTPUT_FORMAT
    ].join("\n");

    // 3) Light factual context (grounding facts, not instructions)
    const ctxBits = [];
    if (userName) ctxBits.push(`User: ${userName}.`);
    if (context?.vibe) ctxBits.push(`Vibe: ${context.vibe}.`);
    if (context?.wish) ctxBits.push(`Wish: ${context.wish}.`);
    if (context?.block) ctxBits.push(`Block: ${context.block}.`);
    if (context?.micro) ctxBits.push(`Last micro: ${context.micro}.`);
    const CONTEXT_FACTS = ctxBits.length ? { role: "system", content: oneLine(ctxBits.join(" ")) } : null;

    const primed = [
      { role: "system", content: SYSTEM },
      CONTEXT_FACTS,
      ...FEWSHOT,
      ...messages,
      text ? { role: "user", content: text } : null
    ].filter(Boolean);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: primed,
      temperature: modelConfig?.temperature ?? 0.8,        // playful + sharp
      top_p: modelConfig?.top_p ?? 1,
      presence_penalty: modelConfig?.presence_penalty ?? 0.5,
      frequency_penalty: modelConfig?.frequency_penalty ?? 0.3,
      max_tokens: modelConfig?.max_output_tokens ?? 200
    });

    let raw = completion?.choices?.[0]?.message?.content || "";

    // 4) Parse JSON; graceful fallback if model slips
    let burst = "";
    let extra = "";
    try {
      const obj = JSON.parse(raw);
      burst = typeof obj?.burst === "string" ? obj.burst : "";
      extra = typeof obj?.extra === "string" ? obj.extra : "";
    } catch {
      // Fallback: treat raw as a single burst
      burst = raw;
      extra = "";
    }

    // 5) Guardrails on text
    burst = ensureAction(clampSentences(sanitizeReply(burst), 3));
    if (extra && /[a-z]/i.test(extra)) {
      // If extra is more than emojis/very short echo, clamp it
      extra = clampSentences(sanitizeReply(extra), 1);
    }

    // Keep backward-compat: return reply (primary) + bursts array for multi-message UIs
    const payload = {
      reply: burst,
      bursts: extra ? [burst, extra] : [burst]
    };

    return res.status(200).json(payload);
  } catch (err) {
    console.error("API /chat error:", err);
    return res.status(200).json({
      reply: "⚡ The lamp flickered. Try again.",
      error: "chat_api_error"
    });
  }
}
