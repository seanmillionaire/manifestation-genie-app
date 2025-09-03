import { useEffect, useState } from "react";
import PrescriptionCard from "./PrescriptionCard";
import { detectBeliefFrom, recommendProduct } from "../../src/engine/recommendProduct";
import { get as getFlow } from "@/src/flowState";


export default function ChatGenieScreen() {
    const ps = (getFlow?.() as any)?.prompt_spec || null;
  const coachPrompt: string | undefined = ps?.prompt;

  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    {
      role: "assistant",
      text: coachPrompt
        ? `🌟 The lamp glows… I’m here.\n\nI’ll guide today’s ritual using your intention:\n${coachPrompt}\n\nWhen you’re ready, tell me the belief or snag to clear first.`
        : `🌟 The lamp glows… I’m here. If you’ve felt stuck—working hard, juggling stress, or doubting yourself—we’ll flip the limiting belief behind it. One tiny move today beats a thousand tomorrows. What belief or snag should we clear right now?`,
    },
  ]);


  const [input, setInput] = useState("");

  // New state for product offer
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

    // Belief detection + recommendation
    const { goal, belief } = detectBeliefFrom(userText);
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

    // TODO: Replace with real assistant call
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "✨ Got it. Let’s break through that belief together.",
        },
      ]);
    }, 600);
  };

  return (
    <main style={{ maxWidth: 700, margin: "30px auto", padding: "0 20px" }}>
      <div style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: 16 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 12,
              textAlign: m.role === "user" ? "right" : "left",
            }}
          >
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
    buyUrl="https://hypnoticmeditations.ai/b/l0kmb" // open in new tab
    onClose={() => setUiOffer(null)}               // hide card after click
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
          <button
            onClick={sendMessage}
            className="btn btn-primary"
            style={{ marginLeft: 8 }}
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
