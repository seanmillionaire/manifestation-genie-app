import { loadConversation } from "../../src/lib/history";

export default async function handler(req, res) {
  const { conversationId } = req.query;
  if (!conversationId) {
    return res.status(400).json({ error: "Missing conversationId" });
  }
  try {
    const messages = await loadConversation({ conversationId });
    return res.status(200).json({ messages });
  } catch (e) {
    console.error("History error:", e);
    return res.status(500).json({ error: "Server error", detail: String(e.message) });
  }
}
