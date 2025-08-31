// pages/api/chat.js
import OpenAI from "openai";
import { buildSystemPrompt, modelConfig } from "../../src/genieBrain";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function coerceString(x) {
  return (typeof x === "string" ? x : x?.toString?.() || "").slice(0, 4000).trim();
}

function mapClientMessages(messages = []) {
  // Accepts various shapes from /pages/chat.js and /pages/chat-genie.js
  return (Array.isArray(messages) ? messages : [])
    .map(m => {
      const roleRaw = m.role || m.author || "user";
      const role = /assistant|genie/i.test(roleRaw) ? "assistant" : "user";
      const content = coerceString(m.content ?? m.text ?? "");
      return content ? { role, content } : null;
    })
    .filter(Boolean);
}

function pickLastUserText({ body }) {
  const { messages = [], input = "", prompt = "" } = body || {};
  const convo = mapClientMessages(messages);
  if (convo.length) {
    const last = convo[convo.length - 1];
    if (last.role === "user" && last.content) return last.content;
  }
  return coerceString(input || prompt);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const userName = req.body?.userName || req.body?.user?.firstName || null;
    const lastUserUtterance = pickLastUserText({ body: req.body });
    const convo = mapClientMessages(req.body?.messages);

    // Build rails
    const system = buildSystemPrompt({ user: { firstName: userName || null } });

    // If empty input, nudge lightly (still 200 to keep UI flow)
    if (!lastUserUtterance) {
      const msg = "Say one clear wish or outcome you want to work on.";
      return res.status(200).json({ ok: true, reply: msg, text: msg, bubbles: [msg] });
    }

    // Call OpenAI (free-flow)
    const completion = await client.chat.completions.create({
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      top_p: modelConfig.top_p,
      presence_penalty: modelConfig.presence_penalty,
      frequency_penalty: modelConfig.frequency_penalty,
      max_tokens: modelConfig.max_output_tokens,
      messages: [
        { role: "system", content: system },
        ...convo,
        // Ensure the latest user turn is present
        ...(convo.length && convo[convo.length - 1].role === "user"
          ? []
          : [{ role: "user", content: lastUserUtterance }])
      ]
    });

    const text = coerceString(completion.choices?.[0]?.message?.content) || "As you wish. What’s the outcome you want?";
    return res.status(200).json({ ok: true, reply: text, text, bubbles: [text] });

  } catch (err) {
    console.error("api/chat error:", err?.message || err);

    // Friendly fallback so the UI doesn’t crash
    const fallback = "The lamp flickered. Try again with one clear wish.";
    return res.status(200).json({ ok: false, reply: fallback, text: fallback, bubbles: [fallback] });
  }
}
