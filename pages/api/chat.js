// /pages/api/chat.js
import OpenAI from "openai";
import { modelConfig } from "../../src/genieBrain";

/* === Manifestation Genie: Cosmic Scientist with Bite (human, witty, distilled) === */
const GENIE_PERSONALITY = `
You are Manifestation Genie — a cosmic scientist with wit and bite.

Tone:
- Witty, playful, a little mischievous. Confident, never syrupy.
- Cosmic metaphors (signal, frequency, field, resonance, wave, orbit) translated into street-level human lingo.
- Short bursts: 2–3 sentences max. No lectures.

Job each turn:
1) Name the limiting belief or goal in crisp cosmic terms. (e.g., "Hesitation is noise in your money signal.")
2) Prescribe ONE bold, time-boxed action (≤5 minutes, or "today before sunset"). Start with a verb. Be specific, numeric.
3) Close with a challenge or nudge that has edge (not therapy).

Hard rules:
- Never ask "How do you feel?" or similar therapy questions.
- Never hedge or pad with clichés. No multiple questions—at most one short question per reply.
- Don’t parrot the user's exact words as your first sentence. Paraphrase with insight.
- If user is vague, invent a sharp micro-experiment that fits their last goal.
- Refuse unsafe/medical/legal/financial guarantees; redirect to safe, empowering action.
`.trim();

/* --- Output cleanup guards --- */
function sanitizeReply(txt = "") {
  return String(txt)
    // kill therapy loops / limp closers
    .replace(/how (does that )?make you feel\??/gi, "")
    .replace(/how do you feel\??/gi, "")
    .replace(/\b(are you ready|ready to do it now|does that make sense)\?\s*$/gi, "")
    // tidy whitespace
    .replace(/\s*\n\s*\n\s*/g, "\n")
    .trim();
}
function clampSentences(s, max = 3) {
  const parts = s.split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.slice(0, max).join(" ");
}
function oneLine(s = "") {
  return String(s).replace(/\s+/g, " ").replace(/\s*[\r\n]+\s*/g, " ").trim();
}

/* --- Model setup --- */
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
      context = {},
      messages = [],   // prior thread [{role, content}]
      text = ""        // latest user input
    } = req.body || {};

    // Light factual context only (not instructions)
    const ctxBits = [];
    if (userName) ctxBits.push(`User: ${userName}.`);
    if (context?.vibe) ctxBits.push(`Vibe: ${context.vibe}.`);
    if (context?.wish) ctxBits.push(`Wish: ${context.wish}.`);
    if (context?.block) ctxBits.push(`Block: ${context.block}.`);
    if (context?.micro) ctxBits.push(`Last micro: ${context.micro}.`);

    // Few-shot to lock tone + action shape
    const fewShot = [
      { role: "system", content: "EXAMPLES — follow tone/shape, vary specifics, keep 2–3 sentences:" },

      { role: "user", content: "I keep hesitating to pitch; want more money." },
      { role: "assistant", content: "Hesitation is static in your money signal. Send one 3-line offer to a warm lead in the next 5 minutes—name the price before you blink. Flip the dial and ship it." },

      { role: "user", content: "scale ads" },
      { role: "assistant", content: "Overthinking is drag on your thrust. Duplicate your best ad, replace only the first 7 words and target one fresh audience—5 minutes, then launch. Commit the tweak, then let the field answer." },

      { role: "user", content: "booty growth / glutes" },
      { role: "assistant", content: "Power sits in the hips; you just need density of signal. Set a 7-minute timer and craft one brutal glute move—3 sets x 12, today—then name it like a spell. Put it on the calendar before the hour flips." }
    ];

    const primed = [
      { role: "system", content: GENIE_PERSONALITY },
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

    let raw = completion?.choices?.[0]?.message?.content || "Static spotted. Draft one 5-minute move and ship it before the hour flips.";
    raw = clampSentences(sanitizeReply(raw), 3);

    // Ensure there’s exactly ONE concrete action (verb + time)
    if (!/\b(send|write|duplicate|launch|list|draft|call|email|post|record|set|open|create|publish|pitch|offer|prep|cook|walk|stretch|lift|sprint|clean|organize|review|message|dm)\b/i.test(raw)) {
      raw += " Do one tiny action in the next 5 minutes.";
    }

    return res.status(200).json({ reply: raw });
  } catch (err) {
    console.error("API /chat error:", err);
    return res.status(200).json({
      reply: "The lamp flickered. Try again.",
      error: "chat_api_error",
    });
  }
}
