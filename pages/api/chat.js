// /pages/api/chat.js
import OpenAI from "openai";
import { buildSystemPrompt, modelConfig } from "../../src/genieBrain";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = modelConfig?.model || process.env.OPENAI_MODEL || "gpt-4o-mini";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      userName = null,
      context = {},     // { vibe, wish, block, micro }
      messages = [],    // prior thread: [{ role, content }]
      text = ""         // latest user input (optional)
    } = req.body || {};

    // Single source of truth: YOUR genie brain (personality & style)
    const SYSTEM = buildSystemPrompt({ user: { firstName: userName || "" } });

    // Optional: light factual context for grounding (not instructions)
    const facts = [];
    if (userName) facts.push(`User: ${userName}`);
    if (context?.vibe)  facts.push(`Vibe: ${context.vibe}`);
    if (context?.wish)  facts.push(`Wish: ${context.wish}`);
    if (context?.block) facts.push(`Block: ${context.block}`);
    if (context?.micro) facts.push(`Last micro: ${context.micro}`);
    const CONTEXT = facts.length ? { role: "system", content: facts.join(" | ") } : null;

    // Build conversation (NO extra rails)
    const convo = [
      { role: "system", content: SYSTEM },
      CONTEXT,
      ...messages,
      text ? { role: "user", content: text } : null
    ].filter(Boolean);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: convo,
      // pull generation knobs only from your brain config
      temperature: modelConfig?.temperature ?? 0.85,
      top_p: modelConfig?.top_p ?? 1,
      presence_penalty: modelConfig?.presence_penalty ?? 0.6,
      frequency_penalty: modelConfig?.frequency_penalty ?? 0.3,
      max_tokens: modelConfig?.max_output_tokens ?? 220
    });

    const reply = completion?.choices?.[0]?.message?.content ?? "";

    // Keep existing contract: return a single reply string
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("API /chat error:", err);
    return res.status(200).json({
      reply: "The lamp flickered. Try again.",
      error: "chat_api_error"
    });
  }
}
