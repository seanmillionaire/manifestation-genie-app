// /pages/api/chat.js
import OpenAI from "openai";
import { buildSystemPrompt, modelConfig } from "../../src/genieBrain";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = modelConfig?.model || process.env.OPENAI_MODEL || "gpt-4o-mini";

// helper: keep replies tight but don’t neuter Genie’s bite
function cleanReply(txt = "") {
  return String(txt)
    .replace(/\s*\n\s*\n\s*/g, "\n") // tidy
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userName = null, context = {}, messages = [], text = "" } = req.body || {};

    // personality from GenieBrain.js
    const SYSTEM = buildSystemPrompt({ user: { firstName: userName || "" } });

    // optional context facts
    const ctxBits = [];
    if (userName) ctxBits.push(`User: ${userName}`);
    if (context?.wish) ctxBits.push(`Wish: ${context.wish}`);
    if (context?.block) ctxBits.push(`Block: ${context.block}`);
    if (context?.vibe) ctxBits.push(`Vibe: ${context.vibe}`);
    const CONTEXT_FACTS = ctxBits.length
      ? { role: "system", content: ctxBits.join(" | ") }
      : null;

    // assemble conversation
    const primed = [
      { role: "system", content: SYSTEM },
      CONTEXT_FACTS,
      ...messages,
      text ? { role: "user", content: text } : null
    ].filter(Boolean);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: primed,
      temperature: modelConfig?.temperature ?? 0.8,
      top_p: modelConfig?.top_p ?? 1,
      presence_penalty: modelConfig?.presence_penalty ?? 0.4,
      frequency_penalty: modelConfig?.frequency_penalty ?? 0.2,
      max_tokens: modelConfig?.max_output_tokens ?? 180
    });

    let reply = completion?.choices?.[0]?.message?.content || "";
    reply = cleanReply(reply);

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("API /chat error:", err);
    return res.status(200).json({
      reply: "The lamp flickered. Try again.",
      error: "chat_api_error"
    });
  }
}
