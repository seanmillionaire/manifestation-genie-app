// /src/wowlines.js
// Tiny bank of hype one-liners. Always money-coded: $, 888, etc.

const WOW_LINES = [
  "Cash falls like confetti when you move first — $ is already orbiting you. 888",
  "Decide fast, profit faster. Your next yes mints money. $888",
  "Bank account = scoreboard. Run the play in the next 5 minutes. $",
  "Your signal is loud; buyers feel it. Make the ask now. $$$",
  "You’re a walking green light — offers chase you. $ 888",
  "Ship the imperfect thing; speed compounds into $ right now.",
  "Rich energy is a habit. Do the bold thing once — wealth repeats. $$$",
  "The universe routes cash to clarity. State the price out loud. $",
  "Money shows up where certainty lives. Stand tall and send it. 888",
  "You’re the storm front of opportunity. Move and let $ rain.",
  "Your timeline just forked richer. DM the offer to one person now. $",
  "The room feels your frequency — raise the price by 10%. 888",
];

export function getRandomWowLine(vibe) {
  const line = WOW_LINES[Math.floor(Math.random() * WOW_LINES.length)];
  // Slight flavor boost for “RICH” vibe
  if (vibe?.id === "RICH" || vibe?.name === "RICH") return line + " 💸";
  return line;
}

export function shouldPopWow({ text = "", reply = "", vibe }) {
  // 20% base chance; 35% if RICH vibe
  const base = (vibe?.id === "RICH" || vibe?.name === "RICH") ? 0.35 : 0.20;
  const rand = Math.random() < base;

  // User intents that should *force* a wow-bite sometimes
  const t = text.toLowerCase();
  const wantsSpice = /(wild|wow|shock|insane|banger|go|more|next|continue)/i.test(t);

  // Don’t tack on if the model already wrote a long paragraph or an ASCII sigil
  const tooLong = (reply || "").split(/\s+/).length > 140;
  const looksLikeSigil = /\n.*[$8#%@*^+=|\\/_-].*\n/.test(reply || "");

  return !tooLong && !looksLikeSigil && (wantsSpice || rand);
}
