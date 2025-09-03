export type StateKind = "Clarity" | "Courage" | "Calm" | "Energy" | null;

export function prescribe({
  outcome,
  block,
  state,
}: {
  outcome?: string | null;
  block?: string | null;
  state?: StateKind;
}) {
  const o = (outcome || "").toLowerCase();
  const b = (block || "").toLowerCase();

  // Outcome → track family
  const family =
    /money|income|sales|client|wealth|cash|job|raise|revenue/.test(o) ? "Money" :
    /love|dating|relationship|partner|soulmate/.test(o) ? "Love" :
    /focus|deep work|ship|write|study|productivity|career/.test(o) ? "Focus" :
    /health|sleep|fitness|diet|weight|run|gym|energy/.test(o) ? "Health" :
    "Focus";

  // Block → protocol
  const protocol =
    /procrastinat|delay|scroll|avoid|later/.test(b) ? "Anti-Procrastination" :
    /doubt|imposter|not.*enough|insecure/.test(b) ? "Self-Belief" :
    /overwhelm|too much|busy|anxious|stress/.test(b) ? "Unwind & Prioritize" :
    /fear|scared|worry|panic/.test(b) ? "Fear Release" :
    "Momentum";

  // State → first meditation name
  const s: Exclude<StateKind, null> = (state || "Clarity");
  const firstMeditation = `${s} Prime: 7-min Reset`;

  return { family, protocol, firstMeditation };
}
