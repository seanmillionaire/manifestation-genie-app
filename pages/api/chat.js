// /pages/api/chat.js — RAW, GenieBrain-only
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
      // you can pass these if you want, but we won’t force them into the prompt:
      // context = {},   // { vibe, wish, block, micro }
      messages = [],      // prior thread: [{ role, content }]
      text = ""           // latest user input (optional)
    } = req.body || {};

    // 🔮 Single source of truth: YOUR Genie Brain (personality + style)
    const SYSTEM = buildSystemPrompt({ user: { firstName: userName || "" } });

    // 🚫 No rails. Just system + conversation.
    const convo = [
      { role: "system", content: SYSTEM },
      ...messages,
      text ? { role: "user", content: text } : null
    ].filter(Boolean);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: convo,
      // Use only your brain config knobs. No extra constraints.
      temperature: modelConfig?.temperature ?? 0.9,
      top_p: modelConfig?.top_p ?? 1,
      presence_penalty: modelConfig?.presence_penalty ?? 0.6,
      frequency_penalty: modelConfig?.frequency_penalty ?? 0.3,
      max_tokens: modelConfig?.max_output_tokens ?? 220
    });

    const reply = completion?.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("API /chat error:", err);
    return res.status(200).json({
      reply: "The lamp flickered. Try again.",
      error: "chat_api_error"
    });
  }
}
