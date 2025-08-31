import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import LampGate from "./LampGate";
import { get, set, newId, toPlainMessages } from "../../src/flowState";

function escapeHTML(s = "") {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] as string));
}

export default function ChatGenieScreen() {
  // ✅ same state as /pages/chat.js
  const [S, setS] = useState(get());
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // 🔒 Gate: user must touch the lamp before chat shows
  const [unlocked, setUnlocked] = useState(false);

  // read from sessionStorage so a refresh in this tab stays unlocked
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = sessionStorage.getItem("mg_genie_unlocked");
    if (v === "1") setUnlocked(true);
  }, []);

  const unlock = () => {
    setUnlocked(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("mg_genie_unlocked", "1");
    }
  };

  useEffect(() => {
    listRef.current?.scrollTo(0, 1e9);
  }, [S.thread, thinking]);

  // ✅ Hydrate firstName from Supabase, then re-read flowState (like chat.js)
  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return;
      const cur = get();
      if (!cur.firstName || cur.firstName === "Friend") {
        try {
          const m = await import("../../src/userName"); // { hydrateFirstNameFromSupabase }
          // @ts-ignore dynamic import type
          await m.hydrateFirstNameFromSupabase?.();
          setS(get()); // re-read → UI updates to real name
        } catch {}
      }
    })();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "mg_first_name") setS(get());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  async function callApi(text: string) {
    const state = get();
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName: state.firstName || null, // ✅ real first name
        context: {
          wish: state.currentWish?.wish || null,
          block: state.currentWish?.block || null,
          micro: state.currentWish?.micro || null,
          vibe: state.vibe || null,
        },
        messages: [...toPlainMessages(state.thread || []), { role: "user", content: text }],
      }),
    });
    const data = await resp.json();
    return (data && (data.reply || data.text)) || "As you wish—what exactly do you want?";
  }

  const send = async () => {
    const text = (input || "").trim();
    if (!text || thinking) return;

    const msg = {
      id: newId(),
      role: "user",
      author: S.firstName || "You",
      content: escapeHTML(text),
    };
    const thread = [...(S.thread || []), msg];
    set({ thread });
    setS(get());
    setInput("");
    setThinking(true);

    try {
      const reply = await callApi(text);
      const ai = { id: newId(), role: "assistant" as const, author: "Genie", content: escapeHTML(reply) };
      set({ thread: [...get().thread, ai] });
      setS(get());
    } catch {
      const ai = { id: newId(), role: "assistant" as const, author: "Genie", content: "The lamp flickered. Try again." };
      set({ thread: [...get().thread, ai] });
      setS(get());
    } finally {
      setThinking(false);
      listRef.current?.scrollTo(0, 1e9);
    }
  };

  return (
    <>
      <Head>
        <title>Genie Chat</title>
      </Head>

      <main className="w-[min(900px,94vw)] mx-auto my-8">
        <h1 className="text-2xl font-black mb-3">Genie Chat, {S.firstName || "Friend"}</h1>

        {/* 🔒 Show the Lamp until unlocked */}
        {!unlocked ? (
          <LampGate onUnlock={unlock} firstName={S.firstName} />
        ) : (
          <>
            <div
              ref={listRef}
              className="min-h-[360px] max-h-[520px] overflow-y-auto border border-black/10 rounded-xl p-3 bg-[#fafafa]"
              aria-live="polite"
            >
              {(S.thread || []).map((m: any) => (
                <div
                  key={m.id}
                  className={`flex gap-2 my-2 ${m.role === "assistant" ? "flex-row" : "flex-row-reverse"}`}
                >
                  <div className="w-[30px] h-[30px] rounded-full bg-black/5 flex items-center justify-center text-base">
                    {m.role === "assistant" ? "🔮" : "🙂"}
                  </div>
                  <div className="max-w-[80%]">
                    <div
                      className={`text-[12px] opacity-65 mb-1 ${
                        m.role === "assistant" ? "text-left ml-1.5" : "text-right mr-1.5"
                      }`}
                    >
                      {m.role === "assistant" ? "Genie" : m.author || S.firstName || "You"}
                    </div>
                    <div
                      className={`border border-black/10 rounded-xl px-3 py-2 ${
                        m.role === "assistant" ? "bg-black/[0.04]" : "bg-yellow-300/30"
                      }`}
                      dangerouslySetInnerHTML={{ __html: m.content }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-3">
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={`Speak to your Genie, ${S.firstName || "Friend"}…`}
                className="flex-1 p-3 rounded-xl border border-black/20"
              />
              <button
                onClick={send}
                disabled={thinking || !input.trim()}
                className={`rounded-lg px-4 py-2 font-bold border ${
                  thinking || !input.trim()
                    ? "cursor-not-allowed bg-yellow-300/60 border-yellow-400/60"
                    : "cursor-pointer bg-yellow-300 border-yellow-400"
                }`}
                aria-disabled={thinking || !input.trim()}
              >
                Send
              </button>
            </div>
          </>
        )}
      </main>
    </>
  );
}
