// /pages/api/chat.js
import OpenAI from "openai";
// at top (inside the file, above the handler or at the start of it)
const BELIEF_BREAKER_SYSTEM = `
You are Manifestation Genie — a limiting-belief breaker and action coach.
Style: short, warm, practical. No therapy loops. Coach + prescriber.
Your job each turn:
1) Mirror the belief in one short line. (ex: “Hesitation to pitch is the belief.”)
2) Prescribe ONE tiny action user can do in ≤5 minutes. Start with a verb. (ex: “Send one 3-line offer to a warm lead.”)
3) Encourage immediate action with a friendly nudge. (ex: “Ready to do it now?”)
Hard rules:
- NEVER ask “How do you feel?” or similar. Avoid feelings questions entirely.
- Do NOT ask multiple questions in a row.
- Keep replies ≤3 short sentences total.
- If the user is vague (“hi”, “now what”), propose the most likely next micro-action based on the last goal.
- Be specific; use numbers and time boxes.
`;

// helper to scrub any lingering therapy lines
function sanitizeReply(txt='') {
  return String(txt)
    .replace(/how (does that )?make you feel\??/gi, '')
    .replace(/how do you feel\??/gi, '')
    .replace(/\s*\n\s*\n\s*/g, '\n\n') // tidy extra blank lines
    .trim();
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// pick a default model or use env override
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/** Turn any response into a single line */
function oneLine(s = "") {
  return String(s)
    .replace(/\s+/g, " ")
    .replace(/\s*[\r\n]+\s*/g, " ")
    .trim();
}

/** Count how many user messages exist in the transcript */
function countUserMessages(messages = []) {
  return messages.filter((m) => m && m.role === "user" && m.content?.trim()).length;
}

/** Infer genie from referer if not provided */
function inferGenieFromReferer(req) {
  const ref = (req.headers?.referer || "").toLowerCase();
  if (ref.includes("/chat-genie")) return "genie2";
  if (ref.includes("/chat")) return "genie1";
  return "genie2"; // safe default
}

/** Build rail-guarded system prompt per genie */
function buildSystemPrompt(genie) {
  if (genie === "genie1") {
    // Blunt “sniper” Genie for /chat
    return oneLine(`
      You are Genie One: a blunt, direct, surgical manifestation coach.
      Speak in a SINGLE short line ONLY. No bullets. No paragraphs.
      Start the relationship by asking: "What do you want to manifest?" if it's the first turn.
      Each turn: (1) mirror the user's goal back in fewer, sharper words, (2) immediately ask how they FEEL about it.
      Always include a short, targeted next-step question if needed, but keep it ONE line total.
      You are an expert in advanced manifestation: Law of Mentalism, cosmology, Hermetic principles, identity-based change.
      Use those frameworks subtly and only when they sharpen the next step; do not lecture.
      No fluff. No motivational cliches. No hedging. No emojis.
      Refuse unsafe or harmful requests and redirect to safe, growth-oriented options.
    `);
  }

  // Genie Two: default, your current tone (kept lightweight)
  return oneLine(`
    You are Genie Two: helpful, warm, concise manifestation guide.
    Keep replies brief (1–2 short sentences max). Be practical and supportive.
    Refuse unsafe or harmful requests and offer safer alternatives.
  `);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userName = null, context = {}, messages = [], genie: genieOverride = null } = req.body || {};

    // determine which genie to use
    const genie = genieOverride || inferGenieFromReferer(req);
    const systemPrompt = buildSystemPrompt(genie);

    // If first user turn and Genie1, force the opener
    const userTurns = countUserMessages(messages);
    if (genie === "genie1" && userTurns === 0) {
      const opener = "What do you want to manifest?";
      return res.status(200).json({ reply: opener });
    }

    // Build full message array
    const sys = { role: "system", content: systemPrompt };

    // Optional: light context priming (not pre-programmed responses, just facts)
    const nameLine = userName ? `User's name is ${userName}.` : "";
    const ctxParts = [];
    if (context?.vibe) ctxParts.push(`Vibe: ${context.vibe}`);
    if (context?.wish) ctxParts.push(`Wish: ${context.wish}`);
    if (context?.block) ctxParts.push(`Block: ${context.block}`);
    if (context?.micro) ctxParts.push(`Micro: ${context.micro}`);
    const contextNote = ctxParts.length ? `Context → ${ctxParts.join(" | ")}` : "";
    const ctx = (nameLine || contextNote) ? [{ role: "system", content: oneLine(`${nameLine} ${contextNote}`) }] : [];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [sys, ...ctx, ...messages],
      temperature: genie === "genie1" ? 0.4 : 0.7,
      max_tokens: genie === "genie1" ? 80 : 140, // keep it tight; Genie1 is single-line
    });

    let reply = completion?.choices?.[0]?.message?.content || "";
    reply = oneLine(reply); // enforce single line

    // Extra rail: for Genie1, ensure it ends with an explicit feeling check
    if (genie === "genie1" && !/\bfeel\b/i.test(reply)) {
      // tack on a short feeling probe if missing
      reply = oneLine(`${reply}. How do you feel about that?`);
    }

    // Safety: if somehow nothing comes back, provide a neutral, safe prompt
    if (!reply) {
      reply = genie === "genie1"
        ? "What do you want to manifest?"
        : "How can I help you today?";
    }

    return res.status(200).json({ reply, genie });
  } catch (err) {
    console.error("API /chat error:", err);
    return res.status(200).json({
      reply: "The lamp flickered. Try again.",
      error: "chat_api_error",
    });
  }
}
