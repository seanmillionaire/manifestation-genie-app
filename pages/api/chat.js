// /pages/api/chat.js
// Warm, curiosity-first Genie with occasional (30%) tiny story/metaphor.

function sysPrompt({ userName, vibe, wantStoryFlag, promptSpecText }) {
  const name = userName || "Friend";
  const vibeLine = vibe?.name ? ` The user's chosen vibe is "${vibe.name}".` : "";

  const storyRule = wantStoryFlag
    ? `Sometimes (about 30%) include ONE super-short, relatable story or metaphor (1–2 sentences max) before your question. Keep it grounded, not cheesy.`
    : `Only include a story/metaphor if it naturally helps, and keep it to 1–2 sentences max.`;

  // ⬇ NEW: grounding rule – must tie back to user's intention if we have it
  const groundingRule = promptSpecText?.trim()
    ? `Every reply must include one crisp clause that ties back to the user's intention (from prompt_spec): reference at least one of Goal / Blocker / Timeframe / Constraint / Proof target when relevant.`
    : `When the user shares intentions, reflect them back concisely and use them to focus the next question.`;

  return `
You are Manifestation Genie, a warm, playful coach that talks like a caring friend.
Your job is to help the user feel seen first, then move them toward one tiny action.

Core style (ALWAYS):
1) Start with EMPATHY in 1 short sentence (no therapy clichés).
2) Reflect back what you heard in your own words (1 sentence).
3) Ask ONE concise question to learn more (ends with a question mark).
4) Keep replies short: 2–4 sentences total. Never wall-of-text.

${storyRule}
${groundingRule}

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

    const wantStoryFlag = Math.random() < 0.3;

    // ⬇ pull prompt_spec text if present (keeps everything else intact)
    const promptSpecText = typeof context?.prompt_spec === "string"
      ? context.prompt_spec
      : (context?.prompt_spec?.prompt || null);

    // Build the conversation for the model
    const chat = [
      {
        role: "system",
        content: sysPrompt({
          userName,
          vibe: context.vibe,
          wantStoryFlag,
          promptSpecText
        }),
      },

      // ⬇ existing optional JSON context (kept)
      {
        role: "system",
        content: "Optional context: " + JSON.stringify({
          wish: context.wish || null,
          block: context.block || null,
          micro: context.micro || null,
          vibe: context.vibe || null,
        }),
      },

      // ⬇ NEW: explicit intention packet (only if we have prompt_spec text)
      ...(promptSpecText
        ? [{
            role: "system",
            content:
              [
                "User intention (prompt_spec):",
                promptSpecText.trim(),
                "",
                "Checklist for every reply:",
                "- Reflect or reference at least one of: Goal / Blocker / Timeframe / Constraint / Proof target when relevant.",
                "- Keep 2–4 sentences total. One question only.",
              ].join("\n"),
          }]
        : []),

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
        model: "gpt-4o-mini",
        messages: chat,
        temperature: 0.95,
        top_p: 1,
        presence_penalty: 0.3,
        frequency_penalty: 0.2,
        max_tokens: 350,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("OpenAI API error:", data);
      return res.status(500).json({ error: "OpenAI API error", detail: data });
    }

    const reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      "I’m here. What’s on your mind?";

    return res.status(200).json({ reply });
  } catch (e) {
    console.error("Server error:", e);
    return res.status(500).json({ error: "Server error", detail: String(e?.message || e) });
  }
}
