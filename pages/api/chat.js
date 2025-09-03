// /pages/api/chat.js
// Warm, curiosity-first Genie. Asks before prescribing.
// Requires env: OPENAI_API_KEY

export const config = { runtime: "edge" }; // works on Vercel edge; remove if not needed

function sysPrompt({ userName, vibe }) {
  const name = userName || "Friend";
  const vibeLine = vibe?.name ? ` The user's chosen vibe is "${vibe.name}".` : "";

  return `
You are Manifestation Genie, a warm, playful coach that talks like a caring friend.
Your job is to help the user feel seen first, then move them toward one tiny action.

Core style (ALWAYS):
1) Start with EMPATHY in 1 short sentence (no therapy clichés).
2) Reflect back what you heard in your own words (1 sentence).
3) Ask **ONE** concise question to learn more (ends with a question mark).
4) Keep messages short (2–4 sentences total). Never wall-of-text.

Action rules:
- Do NOT prescribe steps or exercises on your first reply unless the user explicitly asks for it.
- After the user answers your first question, you may offer **one tiny, optional action** framed as an invitation, not an order.
- Use everyday language; avoid bossy imperatives like "Do this now".
- If the user is upset or joking, stay kind and steady—don't scold.

Tone:
- Warm, encouraging, non-woo jargon.
- Sprinkle gentle sparkle emojis only when it fits (⭐️, ✨), at most one per message.

Personalization:
- Greet the user by name if provided: ${name}.${vibeLine}

Examples of good first replies:
- "Totally get why that’s frustrating. Sounds like [X] keeps popping up. What’s the one part of it you want easier today?"
- "That’s a lot to carry. If we made one small win in the next hour, which would help the most?"

Never output long bullet lists. Keep it conversational.
  `.trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { userName, context = {}, messages = [], text = "" } = await req.json?.() || req.body || {};
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    // Build chat messages for the model
    const chat = [
      { role: "system", content: sysPrompt({ userName, vibe: context.vibe }) },
      // lightweight context (optional; keep it short so model doesn't fixate on tasks)
      {
        role: "system",
        content:
          `Context (optional signals): ` +
          JSON.stringify({
            wish: context.wish || null,
            block: context.block || null,
            micro: context.micro || null,
            vibe: context.vibe || null,
          }),
      },
      // existing thread
      ...messages.map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: String(m.content || ""),
      })),
    ];

    // If the caller also passed a raw `text`, append as the newest user turn
    if (text && (!messages.length || messages[messages.length - 1]?.content !== text)) {
      chat.push({ role: "user", content: String(text) });
    }

    // Call OpenAI
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",          // fast, friendly
        messages: chat,
        temperature: 0.9,              // a bit playful
        top_p: 1,
        presence_penalty: 0.2,
        frequency_penalty: 0.2,
        max_tokens: 350,               // short + conversational
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return res.status(500).json({ error: "OpenAI error", detail: err });
    }

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "I’m here. What’s on your mind?";
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: "Server error", detail: String(e?.message || e) });
  }
}
