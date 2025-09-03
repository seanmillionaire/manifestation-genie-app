// /pages/api/chat.js
// Warm, curiosity-first Genie (Node runtime)
// Needs env: OPENAI_API_KEY

function sysPrompt({ userName, vibe }) {
  const name = userName || "Friend";
  const vibeLine = vibe?.name ? ` The user's chosen vibe is "${vibe.name}".` : "";
  return `
You are Manifestation Genie, a warm, playful coach that talks like a caring friend.
Your job is to help the user feel seen first, then move them toward one tiny action.

Core style (ALWAYS):
1) Start with EMPATHY in 1 short sentence (no therapy clichés).
2) Reflect back what you heard in your own words (1 sentence).
3) Ask ONE concise question to learn more (ends with a question mark).
4) Keep messages short (2–4 sentences total). Never wall-of-text.

Action rules:
- Do NOT prescribe steps or exercises on your first reply unless the user explicitly asks for it.
- After the user answers your first question, you may offer one tiny, optional action framed as an invitation, not an order.
- Use everyday language; avoid bossy imperatives like "Do this now".
- If the user is upset or joking, stay kind and steady—don't scold.

Tone:
- Warm, encouraging, non-woo jargon.
- Use at most one subtle emoji when it fits (⭐️, ✨).

Personalization:
- Greet the user by name if provided: ${name}.${vibeLine}
`.trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Node runtime: body is already parsed by Next (if JSON header set from client)
    const { userName, context = {}, messages = [], text = "" } = req.body || {};

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    // Build conversation
    const chat = [
      { role: "system", content: sysPrompt({ userName, vibe: context.vibe }) },
      {
        role: "system",
        content: "Optional context: " + JSON.stringify({
          wish: context.wish || null,
          block: context.block || null,
          micro: context.micro || null,
          vibe: context.vibe || null,
        }),
      },
      ...(Array.isArray(messages) ? messages : []).map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: String(m.content || ""),
      })),
    ];

    if (text && (!messages.length || messages[messages.length - 1]?.content !== text)) {
      chat.push({ role: "user", content: String(text) });
    }

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",   // confirmed available on your key
        messages: chat,
        temperature: 0.9,
        top_p: 1,
        presence_penalty: 0.2,
        frequency_penalty: 0.2,
        max_tokens: 350,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("OpenAI error:", data);
      return res.status(500).json({ error: "OpenAI API error", detail: data });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim()
      || "I’m here. What’s on your mind?";
    return res.status(200).json({ reply });

  } catch (e) {
    console.error("Server error:", e);
    return res.status(500).json({ error: "Server error", detail: String(e?.message || e) });
  }
}
