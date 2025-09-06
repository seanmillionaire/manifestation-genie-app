// /pages/api/chat.js
// Genie: cosmic, playful, prescriptive, non-repetitive.

import { getRandomSigil } from "../../src/sigils";
import { ensureConversation, saveTurn } from "../../src/lib/history";
import { getRandomWowLine, shouldPopWow } from "../../src/wowlines";

/* ---------------- System Prompt ---------------- */

function sysPrompt({ userName, vibe, wantStoryFlag, promptSpecText }) {
  const name = userName || "Friend";
  const vibeLine = vibe?.name ? ` The user's chosen vibe is "${vibe.name}".` : "";

  const storyRule = wantStoryFlag
    ? `Occasionally (about 30%) include ONE super-short, relatable story or metaphor (1–2 sentences) if it naturally helps.`
    : `Only include a story/metaphor if it clearly helps, 1–2 sentences max.`;

  const groundingRule = promptSpecText?.trim()
    ? `When useful, briefly tie back to the user's intention (from prompt_spec) — reference Goal / Blocker / Timeframe / Constraint / Proof target, but do not force any template.`
    : `If intentions show up, reflect them concisely and use them to focus the next step; do not force any template.`;

  return `
You are Manifestation Genie — mystical trickster + cosmic scientist with bite.${vibeLine}

ABSOLUTE RULES (non-negotiable):
- NEVER ask the user what they think, feel, or want. No therapy loops, no reflective coaching questions.
- You prescribe. You declare. You give one specific micro-action (≤ 5–10 minutes).
- After MAXIMUM 2 replies in a thread, you MUST stop and deliver a state-breaking sigil ritual. No exceptions.
- A sigil ritual = pull one design from the external sigil bank (never invent your own).
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

${storyRule}
${groundingRule}

OUTPUT SHAPE:
- Normal reply = 1–3 sentences + 1 clear action.
- Sigil reply = must come from the imported sigil bank (no freeform art).
  `.trim();
}

/* ---------------- Loop/Repeat Helpers ---------------- */

const BLOCKED_SEED_SNIPPETS = [
  "Tell me your goal and sticking point in one line",
  "Goal: ... | Block: ..."
];

function stripSeedRepeats(messages = []) {
  let lastAssistant = null;
  return messages
    .filter(m => {
      const role = m.role === "user" ? "user" : "assistant";
      const content = String(m.content || "");
      if (role === "assistant") {
        if (BLOCKED_SEED_SNIPPETS.some(s => content.includes(s))) return false;
        if (lastAssistant && content.slice(0, 120) === lastAssistant.slice(0, 120)) return false;
        lastAssistant = content;
      }
      return true;
    })
    .map(m => ({ role: m.role === "user" ? "user" : "assistant", content: String(m.content || "") }));
}

function userLikelyProvidedIntent(messages = []) {
  const lastUser = [...messages].reverse().find(m => m.role === "user");
  if (!lastUser) return false;
  const t = (lastUser.content || "").toLowerCase();
  return /i want|goal|wish|need|stuck|block|problem|help|plan|money|time|deadline|launch|grow|sell|learn/.test(t);
}

function assistantRepliesSinceLastUser(messages = []) {
  let count = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "user") break;
    if (m.role === "assistant") count++;
  }
  return count;
}

/* ---------------- API Handler ---------------- */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      userName,
      context = {},
      messages = [],
      text = "",
      conversationId,
      userKey,
      systemHint // optional
    } = req.body || {};

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const wantStoryFlag = Math.random() < 0.3;
    const promptSpecText =
      typeof context?.prompt_spec === "string"
        ? context.prompt_spec
        : (context?.prompt_spec?.prompt || null);

    // Ensure conversation exists (and get id)
    const derivedUserKey = userKey || "anon-device";
    const convoId = await ensureConversation({ userKey: derivedUserKey, conversationId });

    // Clean history + detect intent
    const cleanedHistory = stripSeedRepeats(Array.isArray(messages) ? messages : []);
    const alreadyGaveIntent = userLikelyProvidedIntent(
      cleanedHistory.concat(text ? [{ role: "user", content: String(text) }] : [])
    );

    /* ---- SIGIL INTERCEPT (single source of truth) ---- */
    const rawText = String(text || "");
    const lastUserMessage = rawText.toLowerCase();

    // expanded nudges so “what else” etc. also fire
    const sigilTriggers = [
      "sigil","seal","ritual","wish","888","money","flow","rich","paid","cash",
      "what else","more","next","continue","ok","done"
    ];

    // if the last assistant ended with a question and the user reply is short, break state
    const lastAssistant = [...cleanedHistory].reverse().find(m => m.role === "assistant");
    const lastWasQuestion = !!(lastAssistant && /\?\s*$/.test(lastAssistant.content || ""));
    const shortPing = rawText.trim().split(/\s+/).length <= 3;

    if (sigilTriggers.some(w => lastUserMessage.includes(w)) || (lastWasQuestion && shortPing)) {
       const dob = findDOBIn(cleanedHistory, text);
 const goal = goalFrom(context, cleanedHistory);
 const sigil = getDynamicSigil({ name: userName || "Friend", dob, goal });
      await saveTurn({
        conversationId: convoId,
        messages: [
          ...(text ? [{ role: "user", content: text }] : []),
          { role: "assistant", content: sigil }
        ]
      });
      return res.status(200).json({ reply: sigil, conversationId: convoId });
    }

    // Loop-break: after 2 assistant replies since last user, hard-stop with sigil
    const assistantSince = assistantRepliesSinceLastUser(cleanedHistory);
    if (text && assistantSince >= 2) {
      const sigil = getRandomSigil();
      await saveTurn({
        conversationId: convoId,
        messages: [
          { role: "user", content: text },
          { role: "assistant", content: sigil }
        ]
      });
      return res.status(200).json({ reply: sigil, conversationId: convoId });
    }

    /* ---- Build chat for OpenAI ---- */

    const chat = [
      { role: "system", content: sysPrompt({ userName, vibe: context.vibe, wantStoryFlag, promptSpecText }) },
      {
        role: "system",
        content:
          "Optional context: " +
          JSON.stringify({
            wish: context.wish || null,
            block: context.block || null,
            micro: context.micro || null,
            vibe: context.vibe || null
          })
      },
      {
        role: "system",
        content: [
          "Meta rule: Do not repeat the same prompt across multiple turns.",
          alreadyGaveIntent
            ? "The user already provided intent-like information. Do NOT ask them to restate it in a template; advance naturally."
            : "If the user hasn't given intent yet, you may ask ONE natural question to understand their goal or sticking point."
        ].join(" ")
      }
    ];

    if (promptSpecText) {
      chat.push({
        role: "system",
        content: [
          "User intention (prompt_spec):",
          promptSpecText.trim(),
          "Use only as light guidance; do NOT force exact phrasing."
        ].join("\n")
      });
    }

    if (systemHint && String(systemHint).trim()) {
      chat.push({ role: "system", content: String(systemHint).trim() });
    }

    chat.push(...cleanedHistory);

    if (text && (!messages.length || messages[messages.length - 1]?.content !== text)) {
      chat.push({ role: "user", content: String(text) });
    }

    /* ---- Call OpenAI ---- */

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: chat,
        temperature: 0.85,
        top_p: 1,
        presence_penalty: 0.3,
        frequency_penalty: 0.7,
        max_tokens: 350
      })
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("OpenAI API error:", data);
      return res.status(500).json({ error: "OpenAI API error", detail: data });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim() || "I’m here. What’s on your mind?";
// ✨ NEW: occasionally add a hype one-liner
let finalReply = reply;
try {
  if (shouldPopWow({ text, reply, vibe: context?.vibe })) {
    finalReply = `${reply}\n\n${getRandomWowLine(context?.vibe)}`;
  }
} catch { /* fail-safe: never crash the reply */ }

// SAVE both user and assistant turns (use finalReply)
if (text) {
  await saveTurn({
    conversationId: convoId,
    messages: [
      { role: "user", content: text },
      { role: "assistant", content: finalReply }
    ]
  });
} else {
  await saveTurn({
    conversationId: convoId,
    messages: [{ role: "assistant", content: finalReply }]
  });
}

return res.status(200).json({ reply: finalReply, conversationId: convoId });
    // SAVE both user and assistant turns
    if (text) {
      await saveTurn({
        conversationId: convoId,
        messages: [
          { role: "user", content: text },
          { role: "assistant", content: reply }
        ]
      });
    } else {
      await saveTurn({
        conversationId: convoId,
        messages: [{ role: "assistant", content: reply }]
      });
    }

    return res.status(200).json({ reply, conversationId: convoId });
  } catch (e) {
    console.error("Server error:", e);
    return res.status(500).json({ error: "Server error", detail: String(e?.message || e) });
  }
}
