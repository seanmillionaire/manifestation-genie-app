// /pages/api/chat.js
import OpenAI from "openai";
import { buildSystemPrompt, modelConfig } from "../../src/genieBrain";

/* ---------------- Output guards + helpers ---------------- */
function sanitizeReply(txt = "") {
  return String(txt)
    .replace(/how (does that )?make you feel\??/gi, "") // no therapy loops
    .replace(/how do you feel\??/gi, "")
    .replace(/\b(what'?s the next action|what do you want to do next|what do you want to tackle next|what'?s next)\??/gi, "")
    .replace(/\s*\n\s*\n\s*/g, "\n") // tidy blanks
    .trim();
}

function clampSentences(s, max = 3) {
  const parts = String(s).split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.slice(0, max).join(" ");
}

function hasTimebox(s) {
  return /\b(5|7|10|15)\s*min(ute)?s?\b|\bthis hour\b|\btoday\b|\bnow\b/i.test(s);
}

function hasVerb(s) {
  return /\b(send|write|draft|list|create|post|record|call|email|dm|pitch|offer|launch|duplicate|edit|publish|prep|cook|walk|stretch|lift|sprint|clean|organize|review|open|set|start|film|shoot|message|outline|script|print|schedule|name|rename|calibrate|timer|upload|ship)\b/i.test(s);
}

function ensureAction(s) {
  let out = s.trim();
  if (!hasVerb(out)) out = out.replace(/\.*\s*$/, "") + ". Do one tiny move now.";
  if (!hasTimebox(out)) out = out.replace(/\.*\s*$/, "") + " Set a 5-minute timer and do it.";
  // prevent double “Take 5 minutes…” if model already added a timebox line
  out = out.replace(/(?:Take|Set)\s+a?\s*5[-\s]?minute[s]?\b.*?(?:\.\s*)?(?=Set a 5-minute timer)/i, "");
  return out.trim();
}

function oneLine(s = "") {
  return String(s).replace(/\s+/g, " ").replace(/\s*[\r\n]+\s*/g, " ").trim();
}

/* ---------------- Model ---------------- */
const MODEL = modelConfig?.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ---------------- Persona overlay + strict JSON output ----------------
- Mystical + witty + playful (Dolores Cannon depth, Aladdin bite)
- Human metaphors, no jargon lectures
- Always prescribe ONE specific action (≤5–10 min) – no open-ended “what do you want to do” prompts
- May include optional emoji echo line
- Output: JSON ONLY -> { "burst": "...", "extra": "..."? }
--------------------------------------------------------------------- */
const OUTPUT_FORMAT = `
FORMAT STRICT:
Return JSON ONLY (no prose), with keys:
{
  "burst": "<1–2 sentences: witty cosmic metaphor + ONE specific action (≤5–10 min) with numbers/time. NO open questions.>",
  "extra": "<OPTIONAL: emojis/very short echo like '🚀✨' or 'Signal locked. 🔊'; else empty string>"
}
Rules:
- Do not ask generic questions (e.g., "what's next", "what action", "what do you want").
- Never ask how they feel. Never lecture. Keep it human, punchy, and specific.
- If the user is spicy/profane, respond with playful bite and re-aim the fire toward action.
`.trim();

/* ---------------- Few-shot examples (JSON) ---------------- */
const FEWSHOT = [
  { role: "system", content: "EXAMPLES — obey JSON format, witty cosmic tone, 2 sentences max in burst:" },

  // Money / pitch
  { role: "user", content: "I keep hesitating to pitch; want more money." },
  { role: "assistant", content: JSON.stringify({
      burst: "Hesitation is static in your money signal. Send one 3-line offer to a warm lead in the next 5 minutes—price included—then press send without blinking.",
      extra: "📡💸"
    })
  },

  // Scale ads
  { role: "user", content: "scale ads" },
  { role: "assistant", content: JSON.stringify({
      burst: "Overthinking is drag on your thrust. Duplicate your best ad, swap only the first 7 words and target one fresh audience—5 minutes, then launch.",
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

  // Adversarial / spicy input
  { role: "user", content: "yo bitch ass" },
  { role: "assistant", content: JSON.stringify({
      burst: "Spice detected—good fuel. Open notes and write one outrageous headline you’d be scared to publish, then post it in the next 5 minutes.",
      extra: "⚡️"
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
      messages = [],         // prior thread: [{role, content}]
      text = ""              // latest user input (optional)
    } = req.body || {};

    // 1) Core DNA from genieBrain (single source of truth)
    const GENIE_DNA = buildSystemPrompt({ user: { firstName: userName || "" } });

    // 2) Strong rails + strict JSON output
    const SYSTEM = [
      GENIE_DNA,
      "",
      "— OVERLAY — Speak like a mystical, witty, playful cosmic guide (Dolores Cannon depth, Aladdin bite).",
      "Use human metaphors (signal, field, spell, orbit). No therapy tone. No generic questions.",
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
      temperature: Math.max(modelConfig?.temperature ?? 0.8, 0.8), // keep it lively
      top_p: modelConfig?.top_p ?? 1,
      presence_penalty: modelConfig?.presence_penalty ?? 0.5,
      frequency_penalty: modelConfig?.frequency_penalty ?? 0.35,
      max_tokens: Math.min(modelConfig?.max_output_tokens ?? 200, 220)
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
      burst = raw;
      extra = "";
    }

    // 5) Guardrails on text
    burst = ensureAction(clampSentences(sanitizeReply(burst), 3));
    if (extra && /[a-z]/i.test(extra)) {
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
