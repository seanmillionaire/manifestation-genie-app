// /src/hooks/useGenieConversation.js
import { useEffect, useState } from "react";

const KEY = "genie_convo_id";

export function useGenieConversation() {
  const [conversationId, setConversationIdState] = useState(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v) setConversationIdState(v);
    } catch {}
  }, []);

  const setConversationId = (id) => {
    setConversationIdState(id);
    try { localStorage.setItem(KEY, id); } catch {}
  };

  return { conversationId, setConversationId };
}
