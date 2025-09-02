import catalog from "./hm_products.json";

type PickArgs = { goal?: string; belief?: string };
type Item = {
  sku: string;
  title: string;
  tags: string[];
  preview: string;
  price: number;
  stripe_price_id: string;
};

export function recommendProduct({ goal = "", belief = "" }: PickArgs): Item | null {
  const g = goal.toLowerCase();
  const b = belief.toLowerCase();

  let scored = (catalog as Item[]).map((p) => {
    let score = 0;
    if (g) p.tags.forEach((t) => { if (t.toLowerCase().includes(g)) score += 3; });
    if (b) p.tags.forEach((t) => { if (t.toLowerCase().includes(b)) score += 2; });
    if (g && p.title.toLowerCase().includes(g)) score += 1;
    if (b && p.title.toLowerCase().includes(b)) score += 1;
    return { p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.score ? scored[0].p : null;
}

export function detectBeliefFrom(text: string) {
  const s = (text || "").toLowerCase();

  const goal =
    s.includes("money") || s.includes("$") || s.includes("sell") ? "money" :
    s.includes("weight") || s.includes("fitness") ? "weight" :
    s.includes("sleep") || s.includes("insomnia") ? "sleep" :
    s.includes("focus") || s.includes("work") || s.includes("procrastination") ? "focus" :
    "";

  const belief =
    /can.?t.*(sell|pitch|close)/.test(s) ? "i’m not persuasive" :
    /always.*(overeat|snack|crave)/.test(s) ? "i’ll always overeat" :
    /(insomnia|can.?t.*sleep|restless)/.test(s) ? "i can’t rest" :
    /(distract|procrastinat)/.test(s) ? "i’m too distracted" :
    s.includes("fear") ? "fear is stopping me" :
    "";

  re
