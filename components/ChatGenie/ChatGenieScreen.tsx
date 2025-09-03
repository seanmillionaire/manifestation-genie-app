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
  // allow extra keys without errors
  [k: string]: unknown;
};

function readQuestionnaireAnswers(): PromptAnswers | null {
  // 1) from flowState
  try {
    const cur = (getFlow?.() as any) || {};
    if (cur?.questionnaire?.answers) return cur.questionnaire.answers as PromptAnswers;
  } catch {}
  // 2) from localStorage
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
  ]
    .filter(Boolean)
    .join("\n");
}

type Msg = { role: "user" | "assistant"; text: string };

export default function ChatGenieScreen() {
  // ensure we have a prompt_spec even if user came straight to /chat
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

  // product offer state
  const [uiOffer, setUiOffer] = useState<null | {
    title: string;
    why: string;
    priceCents: number;
    previewUrl?: string;
    sku: string;
    stripe_price_id: string;
  }>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userText = input.trim();
    setMessages((m) => [...m, { role: "user", text: userText }]);
    setInput("");

    // Belief detection + recommendation (boosted by coachPrompt if present)
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

    // placeholder assistant reply (context-aware)
    setTimeout(() => {
      const goalHint = ps?.goal ? ` toward “${ps.goal}”` : "";
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: belief
            ? `✨ Noted: “${belief}.” Let’s dissolve that pattern${goalHint}. Breathe with me: in for 4, hold 4, out for 6. Ready for a tiny action you can take in the next 10 minutes?`
            : `✨ Got it. Let’s break through that belief together${goalHint}. Want a tiny action you can take in the next 10 minutes?`,
        },
      ]);
    }, 600);
  };

  return (
    <main style={{ maxWidth: 700, margin: "30px auto", padding: "0 20px" }}>
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
        >
          Using your intention from Home •{" "}
          {new Date(((getFlow?.() as any)?.prompt_spec?.savedAt as string) || Date.now()).toLocaleString()}
        </div>
      ) : null}

      <div style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12, textAlign: m.role === "user" ? "right" : "left" }}>
            <div
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: 10,
                background: m.role === "user" ? "#5A189A" : "#1E2A38",
                color: "white",
                maxWidth: "80%",
                fontSize: 18,
                lineHeight: 1.6,
              }}
            >
              {m.text}
            </div>
          </div>
        ))}

        {uiOffer ? (
          <PrescriptionCard
            title={uiOffer.title}
            why={uiOffer.why}
            priceCents={uiOffer.priceCents}
            buyUrl="https://hypnoticmeditations.ai/b/l0kmb"
            onClose={() => setUiOffer(null)}
          />
        ) : null}

        <div style={{ display: "flex", marginTop: 14 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a belief to clear..."
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #333",
              fontSize: 18,
            }}
          />
          <button onClick={sendMessage} className="btn btn-primary" style={{ marginLeft: 8 }}>
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
