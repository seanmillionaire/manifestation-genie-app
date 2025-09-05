// /src/lib/history.js
import { supabase } from "../supabaseClient";

/** Ensure a conversation row exists; return its id */
export async function ensureConversation({ userKey, conversationId }) {
  if (conversationId) return conversationId;
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_key: userKey })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** Append one or more messages: [{ role:'user'|'assistant'|'system', content:string }] */
export async function saveTurn({ conversationId, messages }) {
  if (!conversationId || !Array.isArray(messages) || messages.length === 0) return;
  const rows = messages.map(m => ({
    conversation_id: conversationId,
    role: m.role,
    content: String(m.content || "")
  }));
  const { error } = await supabase.from("messages").insert(rows);
  if (error) throw error;
}

/** Load ordered history for a conversation */
export async function loadConversation({ conversationId, limit = 500 }) {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(m => ({ role: m.role, content: m.content }));
}
