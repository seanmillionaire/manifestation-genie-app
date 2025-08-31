// /pages/api/chat-genie.js
import OpenAI from "openai";
import { buildSystemPrompt, modelConfig } from "../../src/genieBrain"; // <- capital B

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userName = null, messages = [] } = req.body || {};
    const systemPrompt = buildSystemPrompt({ user: { firstName: userName } });

    const completion = await openai.chat.completions.create({
      ...modelConfig,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ]
    });

    const reply = (completion.choices?.[0]?.message?.content || "").trim();
    return res.status(200).json({ reply, genie: "genie2", source: "geniebrain" });
  } catch (err) {
    console.error("API /chat-genie error:", err);
    return res.status(200).json({ reply: "The circuit flickered. Try again." });
  }
}
