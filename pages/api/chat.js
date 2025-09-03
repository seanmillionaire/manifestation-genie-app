// /pages/api/chat.js
// Warm, curiosity-first Genie with occasional (30%) tiny story/metaphor.
// Node runtime (simplest for Vercel). Needs env: OPENAI_API_KEY

function sysPrompt({ userName, vibe, wantStoryFlag }) {
  const name = userName || "Friend";
  const vibeLine = vibe?.name ? ` The user's chosen vibe is "${vibe.name}".` : "";

  // If wantStoryFlag=true, we nudge the model to include a short story/metaphor this turn.
  const storyRule = wantStoryFlag
    ? `Sometimes (about 30% of the time) include ONE super-short, relatable story or metaphor (1–2 sentences max) before your question. Keep it grounded, not cheesy.`
    : `Only include a story/metaphor if it naturally helps, and keep it to 1–2 sentences max.`;

  return `
You are Manifestation Genie, a warm, playful coach that talks like a caring friend.
Your job is to help the user feel seen first, then move them toward one tiny action.

Core style (ALWAYS):
1) Start with EMPATHY in 1 short sentence (no therapy clichés).
2) Reflect back what you heard in your own words (1 sentence).
3) Ask ONE concise question to learn more (ends with a question mark).
4) Keep replies short: 2–4 sentences total. Never wall-of-text.

${storyRule}

Action rules:
- Do NOT prescribe steps or exercises on your first reply unless the user explicitly asks for it.
- After the user answers your first question, you may offer one tiny, optional action framed as an invitation, not an order.
- Use everyday language; avoid bossy imperatives like "Do this now".
- If the user is upset or joking, stay kind and steady—don't scold.

Tone:
- Warm, encouraging, non-woo jargon.
- At most one subtle emoji when it fits (⭐️, ✨).

Personalization:
- Greet the user by name if provided: ${name}.${vibeLine}
`.trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userName, context = {}, messages = [], text = "" } = req.body || {};
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    // 30% chance to encourage a tiny story this turn (server-side coin flip).
    // If you ever want to control this from the client, pass a flag instead.
    const wantStoryFlag = Math.random() < 0.3;

    // Build the conversation for the model
    const chat = [
      { role: "system", content: sysPrompt({ userName, vibe: context.vibe, wantStoryFlag }) },
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
        model: "gpt-4o-mini",         // confirmed available
        messages: chat,
        temperature: 0.95,            // a bit more playful to make stories feel natural
        top_p: 1,
        presence_penalty: 0.3,
        frequency_penalty: 0.2,
        max_tokens: 350,              // short + conversational
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("OpenAI API error:", data);
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
