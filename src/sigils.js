// /src/sigils.js
// Personalized Sri-Yantra style sigils for Manifestation Genie.
// No deps. Exports a dynamic builder + a random fallback for legacy calls.

export const SIGILS = [
  // Fallbacks (kept for safety). We’ll still prefer the dynamic Sri sigil below.
  {
    name: "moneySeal",
    art: `
$$$$$$$$$$$$$$$$
M   O   N   E   Y
8888888888888888
∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞
M   O   N   E   Y
$$$$$$$$$$$$$$$$
`.trim(),
    decree: "The word MONEY is carved into your field. It cannot leave you. 🔮"
  },
  {
    name: "flowCircuit",
    art: `
8888888888888888
F   L   O   W
$∞$∞$∞$∞$∞$∞$∞$∞$
F   L   O   W
8888888888888888
`.trim(),
    decree: "FLOW has been branded into your orbit. The current is already moving. ⚡️"
  },
  {
    name: "richSigil",
    art: `
♆♆♆♆♆♆♆♆♆♆
R   I   C   H
$$$$$$$$$$$$$
8888888888888
R   I   C   H
♆♆♆♆♆♆♆♆♆♆
`.trim(),
    decree: "RICH is written across your timeline. It cannot be erased. 💎"
  },
  {
    name: "paidPortal",
    art: `
∞∞∞∞∞∞∞∞∞∞
P   A   I   D
88888888888
$   $   $   $
88888888888
P   A   I   D
∞∞∞∞∞∞∞∞∞∞
`.trim(),
    decree: "PAID is already sealed. Every channel bends to it. 🌀"
  },
  {
    name: "cashFlood",
    art: `
$$$$$$$$$$$$$$$$
C   A   S   H
8888888888888888
∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞
C   A   S   H
$$$$$$$$$$$$$$$$
`.trim(),
    decree: "CASH floods in without resistance. The seal is live. 🌊"
  }
];

// ---------- helpers ----------
const sp = (s="") => s.toUpperCase().split("").join(" ");
const numbersFrom = (t="") => (t.match(/\d+/g) || []).join("");
function formatMoney(n) {
  try { return new Intl.NumberFormat("en-US").format(Number(n)); } catch { return String(n); }
}
function lifePath(dobStr) {
  // Very light life-path: sum digits; keep 11/22/33 as master if hit on the way.
  if (!dobStr) return null;
  const ds = (dobStr.match(/\d/g) || []).map(Number);
  if (!ds.length) return null;
  const sum = (arr) => arr.reduce((a,b)=>a+b,0);
  let v = sum(ds);
  const master = (x)=> x===11 || x===22 || x===33;
  while (v > 9 && !master(v)) v = sum(String(v).split("").map(Number));
  return v;
}
function center(line, width=29) {
  // crude center for monospaced-ish feel (emoji width varies; good enough)
  const len = line.length;
  if (len >= width) return line;
  const pad = Math.floor((width - len)/2);
  return " ".repeat(pad) + line + " ".repeat(Math.max(0,width - len - pad));
}

// Build the Sri-Yantra style personalized sigil
export function getPersonalSigil({ name="Friend", dob=null, goal=null } = {}) {
  const NAME = sp((name || "Friend").slice(0,18));
  const GOAL = (goal || "my goal").trim();
  const digits = numbersFrom(GOAL);
  const money = digits ? `$${formatMoney(digits)}` : "$888,888";
  const lp = lifePath(dob);
  const lpLine = lp ? `✨${dob} → ${lp} ✨` : "✨ 8 8 8 ✨";

  // triangle bands (Sri-Yantra vibe) + user data woven in
  const topPalm = "🌴".repeat(17);
  const jewelBand = "🏡💎⚡🔥🌌💰🌌🔥⚡💎🏡";
  const triA = "🌺🔺🔻🔺🔻🔺🔻🔺🔻🔺🌺";
  const nameLine = `💎🔻   ${NAME}   🔺💎`;

  const grid = [
    "🏠🔺💎🔺   🌌   🔻💎🔻🏠",
    "🌴⚡💰🌴🔥   🏡   🌴🔥💰🌴⚡",
    "🏠🔻💎🔻   🌌   🔺💎🔺🏠",
  ];

  const wheel = [
    "🌀🌀🌀🌀🌀🌀🌀",
    "💎   🏡   💎",
    "⚡   🔒   ⚡",
    "💰   🏹   💰",
    "🌴   🔥   🌴",
    "🌀🌀🌀🌀🌀🌀🌀",
  ];

  const footerA = "🏡🏡🏡   META → ORO → FLUJO   🏡🏡🏡";
  const footerB = "🌴💰🌴   VENTA SELLADA 💎   🌴💰🌴";
  const footerC = "⚡🔥⚡   ABUNDANCIA LIBERADA 🌌  ⚡🔥⚡";

  const art = [
    topPalm,
    center(jewelBand),
    center(triA),
    center(nameLine),
    center(triA),
    center(jewelBand),
    "",
    center(money),
    center(lpLine),
    "",
    ...grid.map(center),
    "",
    ...wheel.map(center),
    "",
    footerA,
    footerB,
    footerC,
    "",
    topPalm
  ].join("\n");

  const decree = `It is sealed. ${GOAL} is complete and paid. $ flows to ${name}. 🔮`;

  // Always return ASCII + decree together
  return `${art}\n\n${decree}`;
}

// Legacy random fallback (kept for compatibility)
export function getRandomSigil() {
  const idx = Math.floor(Math.random() * SIGILS.length);
  const s = SIGILS[idx];
  return `${s.art}\n\n${s.decree}`;
}

// Smart chooser used by API: prefer personal; else fallback.
export function getDynamicSigil({ name, dob, goal } = {}) {
  // If we have any personal data, build the Sri-Yantra version.
  if ((name && name.trim()) || (dob && /\d/.test(dob)) || (goal && goal.trim())) {
    return getPersonalSigil({ name, dob, goal });
  }
  return getRandomSigil();
}
