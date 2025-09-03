export type Parsed = {
  outcome?: string | null;
  block?: string | null;
  state?: "Clarity" | "Courage" | "Calm" | "Energy" | null;
};

export function parseAnswers(a: any): Parsed {
  const outcome = a?.goal?.trim?.() || a?.outcome?.trim?.() || null;
  const block = a?.blocker?.trim?.() || a?.block?.trim?.() || null;

  const text = `${outcome || ""} ${block || ""}`.toLowerCase();

  const state =
    /confus|unclear|stuck deciding|lost|fog/.test(text) ? "Clarity" :
    /fear|nervous|doubt|hesitant|scared|anxious courage/.test(text) ? "Courage" :
    /overwhelm|too much|stress|panic|busy/.test(text) ? "Calm" :
    /tired|low energy|exhaust|drained|sluggish/.test(text) ? "Energy" :
    null;

  return { outcome, block, state };
}

export function scoreConfidence(p: Parsed): number {
  const wLen = (s?: string | null) => (s || "").trim().split(/\s+/).filter(Boolean).length;
  let s = 0;

  // Specificity: up to 0.4 for outcome, 0.4 for block (based on word count)
  if (p.outcome) s += Math.min(0.4, wLen(p.outcome) * 0.02);
  if (p.block)   s += Math.min(0.4, wLen(p.block) * 0.02);

  // State mention adds 0.2
  if (p.state) s += 0.2;

  // Clamp 0..1
  return Math.max(0, Math.min(1, s));
}

/** Tiny helper to pick variant name */
export function variantFromScore(score: number): "high" | "mid" | "low" {
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "mid";
  return "low";
}
