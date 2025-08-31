// /pages/api/chat-genie.js
// v2: uses your GenieBrain source

// If your module is in /src/geniebrain.js and exports askGenieBrain(...)
import { askGenieBrain } from "../../src/geniebrain";

function toTwoOrThreeSentences(text = "") {
  // Keep it tight: split by sentence-ish stops and rejoin up to ~3
  const parts = String(text).replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/);
  const cut = parts.slice(0, 3).join(" ").trim();
  return cut || text.trim();
}

function safetyGuard(s = "") {
  // ultra-light guardrail: refuse obviously harmful intent
  if (/(suicide|kill|harm|violence|bomb|weapon|abuse|overdose)/i.test(s)) {
    return "I won’t help with harm. Want to refocus on a safe, growth-oriented goal?";
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userName = null, context = {}, messages = [] } = req.body || {};

    // Optional: quick first-turn opener for v2
    const userTurns = messages.filter(m => m?.role === "user" && m.content?.trim()).length;
    if (userTurns === 0) {
      return res.status(200).json({
        reply:
          "Every thought is a frequency—what outcome are you ready to tune into?",
        genie: "genie2",
        source: "geniebrain"
      });
    }

    // Ask your GenieBrain (you already built this)
    // Expect it to return { reply: string } or a plain string
    const brainResult = await askGenieBrain({
      userName,
      context,        // { vibe, wish, block, micro } if you send them
      messages,       // full transcript, same as /api/chat
      persona: "cosmic-scientist" // hint, if your brain supports personas
    });

    let reply =
      (brainResult && (brainResult.reply || brainResult.text)) || String(brainResult || "");

    // Safety & rails (don’t pre-program content—just constrain the shape)
    const redFlag = safetyGuard(reply);
    if (redFlag) reply = redFlag;

    reply = toTwoOrThreeSentences(reply);

    // final polish: keep it crisp
    reply = reply.replace(/\s+/g, " ").trim();

    if (!reply) {
      reply = "What goal shall we run the next experiment on?";
    }

    return res.status(200).json({ reply, genie: "genie2", source: "geniebrain" });
  } catch (err) {
    console.error("API /chat-genie error:", err);
    return res.status(200).json({
      reply: "The circuit crackled. Try again.",
      error: "chat_genie_api_error",
      genie: "genie2",
      source: "geniebrain"
    });
  }
}
