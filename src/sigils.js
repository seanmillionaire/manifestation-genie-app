// sigils.js — Abundance Word Sigils for Manifestation Genie

export const SIGILS = [
  // 1. MONEY SEAL
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

  // 2. FLOW CIRCUIT
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

  // 3. RICH SIGIL
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

  // 4. PAID PORTAL
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

  // 5. CASH FLOOD
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

// Utility to pick one at random
export function getRandomSigil() {
  const idx = Math.floor(Math.random() * SIGILS.length);
  const sigil = SIGILS[idx];
  return `${sigil.art}\n\n${sigil.decree}`;
}
