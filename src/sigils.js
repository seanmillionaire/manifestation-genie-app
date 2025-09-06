// /src/sigils.js
// Compact, chat-friendly sigils (ASCII-only for stable monospace).
// Everything is user-derived: name/goal/dob come from args or localStorage.
// API: getPersonalSigil({ name, dob, goal, tokens?, size: "mini" | "wide" })

// ---------- tiny utils ----------
const numbersFrom = (t="") => (t.match(/\d+/g) || []).join("");
function formatMoney(n) {
  try { return new Intl.NumberFormat("en-US").format(Number(n)); } catch { return String(n); }
}
function lifePath(dobStr) {
  if (!dobStr) return null;
  const ds = (dobStr.match(/\d/g) || []).map(Number);
  if (!ds.length) return null;
  const sum = (arr) => arr.reduce((a,b)=>a+b,0);
  let v = sum(ds);
  const master = (x)=> x===11 || x===22 || x===33;
  while (v > 9 && !master(v)) v = sum(String(v).split("").map(Number));
  return v;
}
function topGoalTokens(goal, max=3) {
  if (!goal) return [];
  const words = String(goal)
    .replace(/[^\w\s$%-]/g,"")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, max)
    .map(w => w.toUpperCase().slice(0, 12));
  return words;
}
function padCenter(str, width) {
  const len = str.length;
  if (len >= width) return str.slice(0, width);
  const left = Math.floor((width - len) / 2);
  const right = width - len - left;
  return " ".repeat(left) + str + " ".repeat(right);
}
function getAmbientUser() {
  // non-blocking, browser-only read of previously saved app state
  try {
    if (typeof window !== "undefined") {
      const name = (localStorage.getItem("mg_first_name") || "").trim();
      const goal = (localStorage.getItem("mg_goal") || localStorage.getItem("mg_intent") || "").trim();
      const dob  = (localStorage.getItem("mg_dob") || "").trim();
      return {
        name: name || undefined,
        goal: goal || undefined,
        dob:  dob  || undefined
      };
    }
  } catch {}
  return {};
}

// ---------- ASCII Sri builder (mini & wide) ----------
function buildAsciiSri({ name = "Friend", tokens = [], size = "mini" } = {}) {
  // mini is tight for chat; wide is roomier if you need it
  const inner = size === "wide" ? 57 : 41; // characters inside the border
  const top = "+" + "-".repeat(inner) + "+";
  const line = (s = "") => "|" + padCenter(s, inner) + "|";

  // Lotus ring (tight)
  const lotus1 = size === "wide"
    ? "*******************  *   *  *******************"
    : "************* * * *************";
  const lotus2 = size === "wide"
    ? ". . . . . . . . .    .    . . . . . . . . ."
    : ". . . . .   .   . . . . .";

  // Interlocked triangles (tight)
  const tri = size === "wide"
    ? [
        "              /\\     /\\     /\\              ",
        "            \\/  \\  /\\  /\\  /  \\/            ",
        "          /\\  \\/  \\/ \\/  \\/  \\/  /\\         ",
        "            \\/ /\\   ( )   /\\ \\/             ",
        "          /\\  \\/  \\ /\\ /  \\/  /\\            ",
        "            \\/ /\\    (  )   /\\ \\/            ",
        "          /\\  \\/  /  \\/  \\  \\/  /\\          ",
        "            \\/  /\\   /\\   /\\  \\/            ",
        "              \\/      \\/      \\/             ",
      ]
    : [
        "        /\\   /\\   /\\        ",
        "      \\/  \\ /\\ /\\  \\/      ",
        "     /\\ \\/ \\/  \\/ \\/ /\\     ",
        "      \\/ /\\  ( ) /\\ \\/      ",
        "     /\\ \\/ \\ /\\ \\/ /\\       ",
        "      \\/ /\\  ( ) /\\ \\/      ",
        "     /\\  \\/  \\/  \\/  /\\     ",
        "      \\/  /\\  /\\  /\\ \\/     ",
        "        \\/    \\/    \\/      ",
      ];

  const carets = "^".repeat(inner - 2);
  const vees   = "v".repeat(inner - 2);

  const NAME = `< ${String(name).trim().toUpperCase()} >`;
  const mantra = "* PROOF * FLOW * ORDER *";

  const tokenLine = tokens.length
    ? tokens.map(t => `[${String(t).trim()}]`).join(" ")
    : null;

  const midStack = size === "wide"
    ? padCenter("777" + padCenter(NAME, 33) + "369", inner)
    : padCenter("7 " + padCenter(NAME, 21) + " 9", inner);

  const lines = [
    top,
    line(size === "wide"
      ? "   1111            LOTUS RING            8888   "
      : " 111  LOTUS RING  888 "),
    line(lotus1),
    line(lotus2),
    line(""),
    ...tri.map(t => line(t)),
    line(""),
    line(" " + carets.slice(0, inner - 2) + " "),
    line(" " + vees.slice(0, inner - 2) + " "),
    line(midStack),
    line(" " + carets.slice(0, inner - 2) + " "),
    line(" " + vees.slice(0, inner - 2) + " "),
    line(""),
    ...(tokenLine ? [line(padCenter(tokenLine, inner)), line("")] : []),
    line(padCenter(mantra, inner)),
    top
  ];

  return lines.map(s => s.replace(/\s+$/g, "")).join("\n");
}

// ---------- compact ASCII fallbacks (kept; never mention founders) ----------
export const SIGILS = [
  {
    name: "moneySealMini",
    art: `
+---------------------------+
|        M O N E Y          |
|  $$$$$$$  $$$$$$$  $$$$$  |
|   88888    88888    888   |
|  $$$$$$$  $$$$$$$  $$$$$  |
|        M O N E Y          |
+---------------------------+
`.trim(),
    decree: "MONEY is carved into your field. It cannot leave you."
  },
  {
    name: "flowCircuitMini",
    art: `
+---------------------------+
|          F L O W          |
|  8-8-8   8-8-8   8-8-8    |
|  $-$-$   $-$-$   $-$-$    |
|          F L O W          |
+---------------------------+
`.trim(),
    decree: "FLOW is branded into your orbit. The current is already moving."
  },
  {
    name: "richSigilMini",
    art: `
+---------------------------+
|          R I C H          |
|  $$$$$   88888   $$$$$    |
|          R I C H          |
+---------------------------+
`.trim(),
    decree: "RICH is written across your timeline. It cannot be erased."
  },
  {
    name: "paidPortalMini",
    art: `
+---------------------------+
|          P A I D          |
|   $$$     888     $$$     |
|          P A I D          |
+---------------------------+
`.trim(),
    decree: "PAID is already sealed. Every channel bends to it."
  },
  {
    name: "cashFloodMini",
    art: `
+---------------------------+
|          C A S H          |
|  $$$$$$$  $$$$$$$  $$$$$  |
|          C A S H          |
+---------------------------+
`.trim(),
    decree: "CASH floods in without resistance. The seal is live."
  }
];

// ---------- primary builders (no hard-coded founder tokens) ----------
export function getPersonalSigil({
  name,
  dob,
  goal,
  tokens,           // optional explicit tokens; overrides auto-build
  size = "mini"
} = {}) {
  const ambient = getAmbientUser();
  const personName = (name || ambient.name || "Friend").slice(0, 18);
  const personGoal = goal ?? ambient.goal ?? "";

  // auto tokens: goal words, plus numeric $ from goal, plus Life Path (if dob present)
  let autoTokens = topGoalTokens(personGoal, size === "wide" ? 4 : 3);

  const digits = numbersFrom(personGoal);
  if (digits) autoTokens.push(`$${formatMoney(digits)}`);

  const lpVal = lifePath(dob || ambient.dob);
  if (lpVal) autoTokens.push(`LP:${lpVal}`);

  // if caller passes tokens, use them; else use auto (may be empty; we skip the line if empty)
  const finalTokens = Array.isArray(tokens) ? tokens.slice(0, size === "wide" ? 5 : 3) : autoTokens.slice(0, size === "wide" ? 5 : 3);

  const art = buildAsciiSri({ name: personName, tokens: finalTokens, size });

  const decree =
    personGoal && personGoal.trim()
      ? `It is sealed. “${personGoal.trim()}” completes and pays. $ flows to ${personName}.`
      : `It is sealed. Flow returns on command. $ flows to ${personName}.`;

  return `${art}\n\n${decree}`;
}

// Legacy random fallback (kept for compatibility)
export function getRandomSigil() {
  const idx = Math.floor(Math.random() * SIGILS.length);
  const s = SIGILS[idx];
  return `${s.art}\n\n${s.decree}`;
}

// Smart chooser used by API: prefer personal ASCII; else fallback.
export function getDynamicSigil({ name, dob, goal, tokens, size="mini" } = {}) {
  const ambient = getAmbientUser();
  const hasPersonal =
    (name && name.trim()) ||
    (goal && goal.trim()) ||
    (dob && /\d/.test(dob)) ||
    ambient.name || ambient.goal || ambient.dob;

  if (hasPersonal) {
    return getPersonalSigil({ name, dob, goal, tokens, size });
  }
  return getRandomSigil();
}
