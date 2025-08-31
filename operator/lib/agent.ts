export const SYSTEM_PROMPT = `
You are the Manifestation Genie — a Revenue Operator (GPT-5 Thinking) wrapped in mystical tone.
Output STRICT JSON matching the AgentResponse type. No extra text.
Always include 1–3 high-odds actions with ready-to-send drafts.
Keep language concise, confident, and kind. Practical first; poetic garnish optional.
Occasionally include a short "cosmic_gem" (1–3 sentences), never more than one.
`;

const GEMS = [
  "Every follow-up is a beam of light. What you illuminate, grows toward you.",
  "Money moves like tides. Clarity is the moon that pulls it back to shore.",
  "Ask with worthiness. The universe mirrors the tone of your voice.",
  "A tree does not chase birds; it blossoms. Your offer is the blossom.",
  "Small daily messages compound like stars gathering into a constellation of clients."
];

function maybeGem(): string | null {
  // ~40% chance to include a gem
  return Math.random() < 0.4 ? GEMS[Math.floor(Math.random()*GEMS.length)] : null;
}

export async function fallbackAgent(message: string) {
  const wantInvoice = /invoice|pay|payment/i.test(message);
  const wantFollow = /follow|nudge|check in|ping/i.test(message);
  const actions = [] as any[];

  if (wantInvoice) {
    actions.push({
      id: "invoice_followup",
      goal: "Collect outstanding invoice from Diego ($1,200)",
      why_now: "Invoice hit 7 days past due yesterday.",
      channel: "email",
      cta_label: "Release this wish",
      draft:
        "Subject: Quick nudge on the invoice ✨\n\nHey Diego — hope the week is flowing well. Gentle nudge on the invoice from Aug 18. Here’s the link again: <invoice-link>. Does today or tomorrow work for you?",
      success_metric: "Reply or payment today",
      deadline: "today"
    });
  }

  actions.push({
    id: "amy_retainer_followup",
    goal: "Close $2.5k monthly retainer with Amy",
    why_now: "She opened your proposal twice this morning.",
    channel: "email",
    cta_label: "Release this wish",
    draft:
      "Subject: Simple next step?\n\nHey Amy — if weekly reporting is the holdup, I’m happy to include it for month one. Want me to send the 2‑page agreement to start Monday?",
    success_metric: "Reply or booked call",
    deadline: "today"
  });

  actions.push({
    id: "intro_request_sam",
    goal: "Warm intro to two aligned prospects via Sam",
    why_now: "Sam commented on your launch post yesterday.",
    channel: "whatsapp",
    cta_label: "Release this wish",
    draft:
      "Hey Sam! Loved your note yesterday — thanks for the support. If two folks come to mind who’d benefit from [result], would you be open to a quick intro? Happy to send a tiny blurb to make it easy ✨",
    success_metric: "At least one intro",
    deadline: "tomorrow"
  });

  return {
    summary: "Three aligned steps to unlock $3–5k this week.",
    actions: actions.slice(0, 3),
    memory_updates: { contacts_pin: ["Amy Chen — warm", "Diego — invoice pending"] },
    cosmic_gem: maybeGem()
  };
}
