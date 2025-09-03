// components/ChatGenie/ChatGenieScreen.tsx
import { useState } from "react";
import PrescriptionCard from "./PrescriptionCard";
import { detectBeliefFrom, recommendProduct } from "../../src/engine/recommendProduct";
import { get as getFlow, set as setFlow } from "../../src/flowState";

type PromptAnswers = {
  goal?: string;
  blocker?: string;
  timeframe?: string;
  constraint?: string;
  proof_line?: string;
  [k: string]: unknown;
};

function readQuestionnaireAnswers(): PromptAnswers | null {
  try {
    const cur = (getFlow?.() as any) || {};
    if (cur?.questionnaire?.answers) return cur.questionnaire.answers as PromptAnswers;
  } catch {}
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("questionnaire_answers");
      if (raw) return JSON.parse(raw) as PromptAnswers;
    } catch {}
  }
  return null;
}

function makePromptFrom(answers: PromptAnswers | null): string {
  if (!answers) return "";
  const { goal, blocker, timeframe, constraint, proof_line } = answers;
  return [
    goal && `Goal: ${goal}`,
    blocker && `Blocker: ${blocker}`,
    timeframe && `Timeframe: ${timeframe}`,
    constraint && `Constraint: ${constraint}`,
    proof_line && `Proof target: ${proof_line}`,
  ].filter(Boolean).join("\n");
}

type Msg = { role: "user" | "assistant"; text: string };

async function callGenieAPI({
  text,
  coachPrompt,
}: {
  text: string;
  coachPrompt?: string;
}): Promise<string> {
  // build a small context payload using prompt_spec so API can use it
  const state = (getFlow?.() as any) || {};
  const context = {
    prompt_spec: state?.prompt_spec || null,
    vibe: state?.vibe || null,
  };

  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      context: {
        ...context,
        coachPrompt: coachPrompt || null,
      },
      messages: [], // you can also pass your thread here later if needed
    }),
  });
  if (!resp.ok) throw new Error("Chat API failed");
  const data = await resp.json();
  return data?.reply || "✨ I’m here.";
}

export default function ChatGenieScreen() {
  // ensure prompt_spec exists
  let ps: any = ((getFlow?.() as any) || {}).prompt_spec || null;
  if (!ps) {
    const answers = readQuestionnaireAnswers();
    if (answers) {
      const prompt = makePromptFrom(answers);
      ps = { ...answers, prompt, savedAt: new Date().toISOString() };
      try {
        const cur = (getFlow?.() as any) || {};
        setFlow({ ...cur, prompt_spec: ps });
      } catch {}
    }
  }
  const coachPrompt: string | undefined = ps?.prompt;

  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: coachPrompt
        ? `🌟 The lamp glows… I’m here.\n\nI’ll guide today’s ritual using your intention:\n${coachPrompt}\n\nWhen you’re ready, tell me the belief or snag to clear first.`
        : `🌟 The lamp glows… I’m here. If you’ve felt stuck—working hard, juggling stress, or doubting yourself—we’ll flip the limiting belief behind it. One tiny move today beats a thousand tomorrows. What belief or snag should we clear right now?`,
    },
  ]);

  const [input, setInput] = useState("");

  const [uiOffer, setUiOffer] = useState<null | {
    title: string;
    why: string;
    priceCents: number;
    previewUrl?: string;
    sku: string;
    stripe_price_id: string;
  }>(null);

  const sendMessage = async () => {
    const userText = input.trim();
    if (!userText) return;

    setMessages((m) => [...m, { role: "user", text: userText }]);
    setInput("");

    // belief detection + upsell
    const contextBoost = coachPrompt ? `${coachPrompt}\n\nUser: ${userText}` : userText;
    const { goal, belief } = detectBeliefFrom(contextBoost);
    const rec = recommendProduct({ goal, belief });
    if (rec) {
      const why = belief
        ? `Limiting belief detected: “${belief}.” Tonight’s session dissolves that pattern so your next action feels natural.`
        : `Based on your goal, this short trance helps you move without overthinking.`;
      setUiOffer({
        title: `Tonight’s prescription: ${rec.title}`,
        why,
        priceCents: rec.price,
        previewUrl: rec.preview,
        sku: rec.sku,
        stripe_price_id: rec.stripe_price_id,
      });
    }

    // real assistant reply via API (uses prompt_spec in context)
    try {
      const reply = await callGenieAPI({ text: userText, coachPrompt });
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "The lamp flickered. Try again in a moment." },
      ]);
    }
  };

  return (
    <main style={{ maxWidth: 820, margin: "30px auto", padding: "0 20px" }}>
      {coachPrompt ? (
        <div
          style={{
            marginBottom: 10,
            fontSize: 13,
            color: "#166534",
            background: "#dcfce7",
            border: "1px solid #86efac",
            borderRadius: 10,
            padding: "6px 10px",
            display: "inline-block",
          }}
          aria-live="polite"
        >
          Using your intention from Home •{" "}
          {new Date(
            (((getFlow?.() as any)?.prompt_spec?.savedAt as string) || Date.now()) as any
          ).toLocaleString()}
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 16,
          padding: 16,
          background: "white",
          boxShadow: "0 6px 22px rgba(0,0,0,0.06)",
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12, textAlign: m.role === "user" ? "right" : "left" }}>
            <div
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: 12,
                background: m.role === "user" ? "#5A189A" : "#0f172a",
                color: "white",
                maxWidth: "74ch",
                fontSize: 16,
                lineHeight: 1.6,
                boxShadow: m.role === "user" ? "0 4px 10px rgba(90,24,154,.25)" : "none",
              }}
            >
              {m.text}
            </div>
          </div>
        ))}

        {uiOffer ? (
          <div style={{ marginTop: 8 }}>
            <PrescriptionCard
              title={uiOffer.title}
              why={uiOffer.why}
              priceCents={uiOffer.priceCents}
              buyUrl="https://hypnoticmeditations.ai/b/l0kmb"
              onClose={() => setUiOffer(null)}
            />
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a belief to clear..."
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.15)",
              fontSize: 16,
              background: "#f8fafc",
            }}
          />
          <button
            onClick={sendMessage}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: 0,
              background: "#facc15",
              borderBottom: "2px solid #eab308",
              fontWeight: 900,
              minWidth: 88,
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
