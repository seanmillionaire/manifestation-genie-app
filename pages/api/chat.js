// /pages/api/chat.js
import OpenAI from "openai";
import { buildSystemPrompt, modelConfig } from "../../src/genieBrain";

/* ---------------- Output guards (no therapy, no questions) ---------------- */
function sanitizeReply(txt = "") {
  return String(txt)
    .replace(/how (does that )?make you feel\??/gi, "")
    .replace(/how do you feel\??/gi, "")
    .replace(/\b(what'?s the next action|what do you want( to)?|what'?s next|what action)\b.*?\?/gi, "")
    .replace(/\b(ready to|are you ready|shall we)\b.*?\?/gi, "")
    .replace(/\s*\n\s*\n\s*/g, "\n")
    .trim();
}

function sentences(s) {
  return String(s).split(/(?<=[.!?])\s+/).filter(Boolean);
}

function stripQuestions(s) {
  const keep = sentences(s).filter(line => !/\?/.test(line));
  // if everything got stripped, keep original but replace '?' with '.'
  if (!keep.length) {
    return sentences(s).map(line => line.replace(/\?/g, ".")).join(" ");
  }
  return keep.join(" ");
}

function makeImperative(s) {
  // If first token isn't an obvious verb, prepend a verby lead.
  const trimmed = s.trim();
  const startsVerb = /^\b(send|write|draft|list|create|post|record|call|email|dm|pitch|offer|launch|duplicate|edit|publish|prep|cook|walk|stretch|lift|sprint|clean|organize|review|open|set|start|film|shoot|message|outline|script|print|schedule|name|rename|calibrate|upload|ship)\b/i.test(trimmed);
  return startsVerb ? trimmed : ("Convert that heat into a move. " + trimmed);
}

function hasTimebox(s) {
  return /\b(5|7|10|15)\s*min(ute)?s?\b|\bthis hour\b|\btoday\b|\bnow\b/i.test(s);
}
function hasVerb(s) {
  return /\b(send|write|draft|list|create|post|record|call|email|dm|pitch|offer|launch|duplicate|edit|publish|prep|cook|walk|stretch|lift|sprint|clean|organize|review|open|set|start|film|shoot|message|outline|script|print|schedule|name|rename|calibrate|upload|ship)\b/i.test(s);
}

function ensureAction(s) {
  let out = s.trim();
  // kill generic “prove intent / make it happen” fluff
  out = out.replace(/\b(prove your intent|let'?s make it happen|make it happen|let'?s go)\b.*?$/i, "").trim();
  if (!hasVerb(out)) out = out.replace(/\.*\s*$/, "") + ". Set a 5-minute timer and draft one bold line that moves this forward.";
  if (!hasTimebox(out)) out = out.replace(/\.*\s*$/, "") + " Do it in the next 5 minutes.";
  return out.trim();
}

function clampTwoSentences(s) {
  const parts = sentences(s).slice(0, 2); // 2 sentences max
  return parts.join(" ");
}

function oneLine(s = "") {
  return String(s).replace(/\s+/g, " ").replace(/\s*[\r\n]+\s*/g, " ").trim();
}

/* ---------------- Model ---------------- */
const MODEL = modelConfig?.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ---------------- Strict JSON output w/ style rails ----------------
- Mystical + witty + playful (Dolores Cannon depth, Aladdin bite)
- Human metaphors (signal, field, spell, orbit), no lectures
- Always ONE specific action (≤5–10 min), concrete numbers
- NO QUESTIONS. Period.
- JSON ONLY: { "burst": "...", "extra": "..."? }
------------------------------------------------------------------- */
const OUTPUT_FORMAT = `
FORMAT STRICT:
Return JSON ONLY:
{
  "burst": "<max 2 short sentences: cosmic metaphor + ONE specific action (≤5–10 min) with numbers/time. NO questions.>",
  "extra": "<OPTIONAL: 1 ultra-short echo or 1–3 emojis, or empty string>"
}
Rules:
- No questions. No “what's next”. No “ready to…”.
- Never ask about feelings. No therapy tone.
- Keep it human, punchy, witty. Cosmic, not jargon.
`.trim();

/* ---------------- Few-shots (cover heat + confusion) ---------------- */
const FEWSHOT = [
  { role: "system", content: "EXAMPLES — obey JSON format, witty cosmic tone, 2 sentences in burst, NO questions:" },

  // Money / pitch
  { role: "user", content: "I keep hesitating to pitch; want more money." },
  { role: "assistant", content: JSON.stringify({
      burst: "Hesitation is static in your money signal. Send one 3-line offer to a warm lead in the next 5 minutes—price included—then hit send without blinking.",
      extra: "📡💸"
    })
  },

  // Scale ads
  { role: "user", content: "scale ads" },
  { role: "assistant", content: JSON.stringify({
      burst: "Overthinking is drag on your thrust. Duplicate your best ad, swap the first 7 words and target one fresh audience—launch in 5 minutes.",
      extra: "🚀"
    })
  },

  // Glutes
  { role: "user", content: "booty growth" },
  { role: "assistant", content: JSON.stringify({
      burst: "Power sits in the hips—condense the signal. Set a 7-minute timer and craft one brutal glute move (3x12 today), then name it like a spell.",
      extra: "🔥🍑"
    })
  },

  // Adversarial heat
  { role: "user", content: "yo bitch ass" },
  { role: "assistant", content: JSON.stringify({
      burst: "Spice detected—aim it like a laser. Open notes and write one outrageous headline you’re scared to publish, then post it in 5 minutes.",
      extra: "⚡️"
    })
  },

  // Confusion
  { role: "user", content: "wtf" },
  { role: "assistant", content: JSON.stringify({
      burst: "Chaos is just unshaped charge. Set a 5-minute timer and list three moves that would change today’s outcome—then execute the first one.",
      extra: "🧲"
    })
  }
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
      messages = [],
      text = ""
    } = req.body || {};

    // 1) Genie DNA (single source of truth)
    const GENIE_DNA = buildSystemPrompt({ user: { firstName: userName || "" } });

    // 2) Strong rails + strict JSON
    const SYSTEM = [
      GENIE_DNA,
      "",
      "— OVERLAY — Mystical, witty, playful cosmic guide (Dolores Cannon depth, Aladdin bite).",
      "Use human metaphors (signal, field, spell, orbit). No lectures. No questions.",
      "Always prescribe ONE specific action (≤5–10 min) with numbers/time.",
      OUTPUT_FORMAT
    ].join("\n");

    // 3) Light factual context (grounding only)
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
      temperature: Math.max(modelConfig?.temperature ?? 0.8, 0.85),
      top_p: modelConfig?.top_p ?? 1,
      presence_penalty: modelConfig?.presence_penalty ?? 0.55,
      frequency_penalty: modelConfig?.frequency_penalty ?? 0.35,
      max_tokens: Math.min(modelConfig?.max_output_tokens ?? 200, 220)
    });

    let raw = completion?.choices?.[0]?.message?.content || "";

    // 4) Parse JSON; graceful fallback
    let burst = "";
    let extra = "";
    try {
      const obj = JSON.parse(raw);
      burst = typeof obj?.burst === "string" ? obj.burst : "";
      extra = typeof obj?.extra === "string" ? obj.extra : "";
    } catch {
      burst = raw;
      extra = "";
    }

    // 5) Guards: no questions, imperative, concrete action, ≤2 sentences
    burst = sanitizeReply(burst);
    burst = stripQuestions(burst);
    burst = makeImperative(burst);
    burst = ensureAction(burst);
    burst = clampTwoSentences(burst);

    if (extra) {
      // extra should be emojis or ultra-short echo—no questions
      extra = sanitizeReply(extra);
      extra = stripQuestions(extra);
      extra = clampTwoSentences(extra);
    }

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
