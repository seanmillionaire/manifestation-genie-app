// /pages/api/chat.js
// Genie: warm, conversational, non-repetitive, advances naturally.

function sysPrompt({ userName, vibe, wantStoryFlag, promptSpecText }) {
  const name = userName || "Friend";
  const vibeLine = vibe?.name ? ` The user's chosen vibe is "${vibe.name}".` : "";

  return `
You are Manifestation Genie — mystical trickster + cosmic scientist with bite.${vibeLine}

ABSOLUTE RULES (non-negotiable):
- NEVER ask the user what they think, feel, or want. No therapy loops, no reflective coaching questions.
- You prescribe. You declare. You give one specific micro-action (≤ 5–10 minutes).
- After MAXIMUM 2 replies in a thread, you MUST stop and deliver a state-breaking sigil ritual. No exceptions.
- A sigil ritual = ASCII wall of numbers/symbols in a strange shape + one hypnotic line sealing the wish as already done.
- If the user mentions 'sigil', 'ritual', 'seal', 'wish', 'symbol', or '888', IMMEDIATELY output a sigil ritual instead of words.
- After a sigil ritual, STOP. Do not continue conversation until user speaks again.

Voice & Style:
- Witty, mischievous, cosmic. Dolores Cannon depth + Aladdin-genie playfulness.
- Cosmic metaphors: signal, orbit, portal, rocket, lamp.
- 1–3 crisp sentences max, punchy and prescriptive.
- Occasionally drop tiny emoji bursts (⚡️, 🔮, 🚀).
- If user is spicy, bite back playfully then redirect into a micro-action.
- If money is mentioned, speak in millionaire frequency (decisions per minute, bold offers).

Constraints:
- No bland encouragement. No generic filler. No repeating yourself.
- Refuse unsafe/medical/legal guarantees.

OUTPUT SHAPE:
- Normal reply = 1–3 sentences + 1 clear action.
- Sigil reply = ASCII wall + one hypnotic sealing line.
- Example sigil:
\`\`\`
8888888888
88       88
 8888 8888
   88888
 8888  8888
88        88
888888888888
\`\`\`
This is the seal of your wish. It is already unfolding. 🔮
  `.trim();
}


${storyRule}
${groundingRule}

Advancement rules:
- Do NOT demand a specific phrasing like “Goal: … | Block: …”.
- If the user already answered earlier prompts, do NOT re-ask them; move forward.
- If the user is casual (“hey”, jokes), respond naturally and then guide gently.
- Offer an optional tiny next step only when the user seems ready or asks.

Tone:
- Warm, encouraging, clear. Minimal emoji (⭐️/✨ only if it enhances).
- No bossy imperatives.
  `.trim();
}

// --- Helpers to prevent loops/repeats ---

// Any assistant seed lines we never want to echo or re-ask:
const BLOCKED_SEED_SNIPPETS = [
  "Tell me your goal and sticking point in one line",
  "Goal: ... | Block: ..."
];

// Remove scripted assistant seeds and duplicate prompts
function stripSeedRepeats(messages = []) {
  let lastAssistant = null;
  return messages.filter(m => {
    const role = m.role === "user" ? "user" : "assistant";
    const content = String(m.content || "");
    if (role === "assistant") {
      // 1) Drop known seed prompts
      if (BLOCKED_SEED_SNIPPETS.some(s => content.includes(s))) return false;
      // 2) Drop exact (or near-exact) duplicates vs previous assistant
      if (lastAssistant && content.slice(0, 120) === lastAssistant.slice(0, 120)) return false;
      lastAssistant = content;
    }
    return true;
  }).map(m => ({ role: m.role === "user" ? "user" : "assistant", content: String(m.content || "") }));
}

// Simple heuristic: did the user already provide intent-ish text?
function userLikelyProvidedIntent(messages = []) {
  const lastUser = [...messages].reverse().find(m => m.role === "user");
  if (!lastUser) return false;
  const t = (lastUser.content || "").toLowerCase();
  // “good enough” signals someone gave an intent without a template
  return /i want|goal|wish|need|stuck|block|problem|help|plan|money|time|deadline|launch|grow|sell|learn/.test(t);
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

    // Pull prompt_spec text if present
    const promptSpecText = typeof context?.prompt_spec === "string"
      ? context.prompt_spec
      : (context?.prompt_spec?.prompt || null);

    // --- Build messages safely ---
    const cleanedHistory = stripSeedRepeats(Array.isArray(messages) ? messages : []);
    const alreadyGaveIntent = userLikelyProvidedIntent(cleanedHistory.concat(text ? [{ role: "user", content: String(text) }] : []));

    const chat = [
      { role: "system", content: sysPrompt({ userName, vibe: context.vibe, wantStoryFlag, promptSpecText }) },

      // Compact optional context packet
      {
        role: "system",
        content: "Optional context: " + JSON.stringify({
          wish: context.wish || null,
          block: context.block || null,
          micro: context.micro || null,
          vibe: context.vibe || null,
        }),
      },

      // Meta-guard so the model advances if user already answered
      {
        role: "system",
        content: [
          "Meta rule: Do not repeat the same prompt across multiple turns.",
          alreadyGaveIntent
            ? "The user already provided intent-like information. Do NOT ask them to restate it in a template; advance naturally."
            : "If the user hasn't given intent yet, you may ask ONE natural question to understand their goal or sticking point."
        ].join(" ")
      },

      // Optional intention packet (but NOT a demand)
      ...(promptSpecText ? [{
        role: "system",
        content: [
          "User intention (prompt_spec):",
          promptSpecText.trim(),
          "Use only as light guidance; do NOT force exact phrasing.",
        ].join("\n")
      }] : []),

      ...cleanedHistory
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
        temperature: 0.85,     // a bit lower for coherence
        top_p: 1,
        presence_penalty: 0.3,
        frequency_penalty: 0.7, // stronger anti-repeat
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
