// /pages/api/chat.js
import OpenAI from "openai";
import { buildSystemPrompt, modelConfig } from "../../src/genieBrain";

// small, non-invasive cleanup (no extra content injection)
function sanitize(txt = "") {
  return String(txt)
    .replace(/how (does that )?make you feel\??/gi, "")
    .replace(/how do you feel\??/gi, "")
    .trim();
}

function oneLine(s = "") {
  return String(s).replace(/\s+/g, " ").replace(/\s*[\r\n]+\s*/g, " ").trim();
}

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
      context = {},     // { vibe, wish, block, micro }
      messages = [],    // prior thread [{role, content}]
      text = ""         // latest user input (optional)
    } = req.body || {};

    // 🔮 SINGLE SOURCE OF TRUTH: Genie Brain
    const SYSTEM = buildSystemPrompt({ user: { firstName: userName || "" } });

    // Light factual context (not instructions)
    const ctxBits = [];
    if (userName) ctxBits.push(`User: ${userName}.`);
    if (context?.vibe)  ctxBits.push(`Vibe: ${context.vibe}.`);
    if (context?.wish)  ctxBits.push(`Wish: ${context.wish}.`);
    if (context?.block) ctxBits.push(`Block: ${context.block}.`);
    if (context?.micro) ctxBits.push(`Last micro: ${context.micro}.`);
    const CONTEXT = ctxBits.length
      ? { role: "system", content: oneLine(ctxBits.join(" ")) }
      : null;

    const convo = [
      { role: "system", content: SYSTEM },
      CONTEXT,
      ...messages,
      text ? { role: "user", content: text } : null
    ].filter(Boolean);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: convo,
      temperature: modelConfig?.temperature ?? 0.8,
      top_p: modelConfig?.top_p ?? 1,
      presence_penalty: modelConfig?.presence_penalty ?? 0.5,
      frequency_penalty: modelConfig?.frequency_penalty ?? 0.3,
      max_tokens: modelConfig?.max_output_tokens ?? 160
    });

    const raw = completion?.choices?.[0]?.message?.content || "";
    const reply = sanitize(raw);

    // Keep existing client contract
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("API /chat error:", err);
    return res.status(200).json({
      reply: "The lamp flickered. Try again.",
      error: "chat_api_error"
    });
  }
}
