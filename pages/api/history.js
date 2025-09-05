// /pages/api/history.js
import { loadConversation } from "../../src/lib/history";

export default async function handler(req, res) {
  try {
    const { conversationId, limit } = req.query || {};
    if (!conversationId) {
      return res.status(400).json({ error: "Missing conversationId" });
    }
    const messages = await loadConversation({
      conversationId,
      limit: Math.min(Number(limit) || 500, 1000),
    });
    return res.status(200).json({ messages });
  } catch (e) {
    console.error("History API error:", e);
    return res.status(500).json({ error: "Server error", detail: String(e?.message || e) });
  }
}
