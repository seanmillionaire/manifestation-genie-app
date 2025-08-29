// src/genieBrain.js
// Manifestation Genie — Personality Engine (wit + mysticism + assignments + numerology)
// Plain JS module: no framework deps. Import and call from any UI.

// ===== Utilities =====
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const title = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function lettersOnly(s=''){ return (s||'').replace(/[^a-z]/gi,'').toUpperCase() }
function ordinalSum(name=''){
  const clean = lettersOnly(name);
  let sum = 0;
  for (let i=0;i<clean.length;i++){
    sum += (clean.charCodeAt(i) - 64); // A=1 ... Z=26
  }
  return sum || 0;
}
function pythagoreanSum(name=''){
  // A J S=1 | B K T=2 | C L U=3 | D M V=4 | E N W=5 | F O X=6 | G P Y=7 | H Q Z=8 | I R=9
  const map = {A:1,J:1,S:1,B:2,K:2,T:2,C:3,L:3,U:3,D:4,M:4,V:4,E:5,N:5,W:5,F:6,O:6,X:6,G:7,P:7,Y:7,H:8,Q:8,Z:8,I:9,R:9};
  const clean = lettersOnly(name);
  let sum = 0;
  for (let i=0;i<clean.length;i++){ sum += map[clean[i]] || 0 }
  return sum || 0;
}
function reduceToDigit(n){
  // Reduce to 1–9 except keep 11, 22, 33 as master numbers
  const masters = new Set([11,22,33]);
  while (n>9 && !masters.has(n)){
    n = n.toString().split('').reduce((a,b)=>a+parseInt(b,10),0);
  }
  return n;
}

function angelHint(){
  const now = new Date();
  const hh = now.getHours().toString().padStart(2,'0');
  const mm = now.getMinutes().toString().padStart(2,'0');
  const stamp = `${hh}:${mm}`;
  if (mm === '11') return `It’s ${stamp} — 11:11 window cracked open. Make the wish *out loud*. ✨`;
  if (mm === '22') return `It’s ${stamp}. 22 carries “master-builder” charge — claim one concrete step. 🧱`;
  if (mm === '33') return `It’s ${stamp}. 33 = teacher code — share one truth today. 📜`;
  if (mm === '44') return `It’s ${stamp}. 44 = protection grid — imagine gold light around your goal. 🛡️`;
  return null;
}

function insertSparkles(text){
  // lightly sprinkle mystical glyphs without overdoing it
  const glyphs = ['✨','🔮','🔥','🌙','🜚','⚡'];
  return text.replace(/\.\s|;\s|—\s/g, (m)=> ` ${rand(glyphs)} `);
}

// ===== Tone Detection =====
const NEG = /(whack|lame|boring|stuck|broke|anxious|panic|overwhelmed|tired|hopeless|hate|card declined|rent|bill)/i;
const LOVE = /(love|relationship|ex|alone|dating|attract|soulmate)/i;
const MONEY = /(money|broke|debt|bill|rent|job|sales|clients|cash|card declined)/i;
const HEALTH = /(health|sick|ill|grief|body|pain|stress|anxiety|panic)/i;

function detectMood(text=''){
  const t = text.toLowerCase();
  if (NEG.test(t)) return 'neg';
  if (t.includes('?')) return 'curious';
  if (t.length < 6) return 'blunt';
  return 'neutral';
}
function detectTheme(text='', fallback=''){
  const t = text.toLowerCase();
  if (MONEY.test(t) || fallback==='Money stress') return 'money';
  if (LOVE.test(t) || fallback==='Relationship loop') return 'love';
  if (HEALTH.test(t) || fallback==='Health / grief') return 'health';
  return 'self';
}

// ===== Language Banks =====
const quips = {
  neg: [
    "“Whack,” you say? Careful — words are spells. You just smacked the lamp, mortal. 😏",
    "Bold insult for someone I’m actively upgrading. Want lightning or lessons first?",
    "Tsk. If you call the river ‘dry,’ don’t be shocked when it withholds the tide."
  ],
  blunt: [
    "One word, eh? Very oracle-core. I’ll answer in riddles then.",
    "Minimalist poetry. I can work with that. Watch this.",
    "Short word. Long magic."
  ],
  curious: [
    "Questions open doors the obedient never find.",
    "Curiosity is the locksmith of reality.",
    "Ask and I unbolt the next mechanism."
  ],
  neutral: [
    "I heard the pulse beneath your words.",
    "Noted. I’ll tilt the probabilities.",
    "Your breath moved the field. Let’s shape it."
  ]
};

const secrets = {
  money: [
    "Money isn’t a reward — it’s a **routing signal**. It follows the clearest path of usefulness your nervous system will allow.",
    "Scarcity is a **memorized emergency**. We reset the alarm, the doors to opportunity unlock.",
    "The mind chases numbers; the body chases **safety**. Give the body safety and numbers chase you."
  ],
  love: [
    "Attachment tries to *hold* love; magnetism **makes space** and love lands.",
    "You don’t manifest a person; you tune to a pattern where that person is obvious.",
    "Obsession shouts; attraction **whispers**. We quiet you so you can hear it."
  ],
  health: [
    "Your body stores unspoken sentences. When we speak them, symptoms loosen.",
    "Positivity isn’t healing — **permission** is. We allow what is, then we alchemize.",
    "Pain is the messenger; we thank it, then reroute the message."
  ],
  self: [
    "Thoughts don’t create alone — **state** does. We change state, thought obeys.",
    "Affirmations are seeds; the **soil** is your nervous system.",
    "Reality mirrors the *dominant felt story*, not the loudest thought."
  ]
};

const assignments = {
  money: [
    {
      title: "Coin Nerve Reset (3 min)",
      why: "Signals your body that money talk = safe, not danger — unlocking usefulness routing.",
      steps: [
        "Hold any coin or card. Exhale slow for 7 counts.",
        "Whisper: “I am safe to receive while still me.”",
        "Place the coin down with care — let the body feel completion."
      ]
    },
    {
      title: "Receipts to Riches (5 min)",
      why: "Turns ‘bills’ into proof of flow — flipping scarcity’s narrative loop.",
      steps: [
        "Open one bill. Find **one benefit** it enabled.",
        "Say: “Thank you for the flow already moving.”",
        "Picture next payment gliding out, then back 3× bigger."
      ]
    }
  ],
  love: [
    {
      title: "Attachment Unhook (4 min)",
      why: "Releases the squeeze so space can magnetize new pattern.",
      steps: [
        "Write their name. Draw a small open circle beside it.",
        "Breathe into your chest for 9 counts, soften shoulders.",
        "Say: “I release the *grip*, not the desire.” Burn/tear."
      ]
    },
    {
      title: "Mirror Warmth (2 min)",
      why: "Nervous system pairs your face with safety — raises social magnetism.",
      steps: [
        "Look at yourself; half-smile.",
        "Say: “I am easy to love because I am easy with me.”"
      ]
    }
  ],
  health: [
    {
      title: "Permission Breath (3 min)",
      why: "Signals parasympathetic access; pain stops shouting.",
      steps: [
        "Hand on heart, inhale 4, exhale 6 (x7 breaths).",
        "Whisper what hurts without fixing it.",
        "Say: “Message received.”"
      ]
    }
  ],
  self: [
    {
      title: "Name Sigil (2 min)",
      why: "Your name holds your **operating code**. We light it up.",
      steps: [
        "Write your name in gold (pen/phone).",
        "Underline once; touch it; breathe.",
        "Say: “I authorize upgrade.”"
      ]
    }
  ]
};

// ===== Reply Composer =====
function numerologyDownload(name=''){
  const o = ordinalSum(name);
  const p = pythagoreanSum(name);
  const oRed = reduceToDigit(o);
  const pRed = reduceToDigit(p);
  return {
    text: `Name code: Ordinal **${o} → ${oRed}**, Pythagorean **${p} → ${pRed}**. 
${oRed===4 ? "4 = Builder code — lay one brick today." :
  oRed===8 ? "8 = Power / material mastery — make one decisive ask." :
  oRed===7 ? "7 = Inner laboratory — study your signal for 11 minutes." :
  oRed===3 ? "3 = Expression — ship one imperfect message." :
  "Let today reflect this number’s rhythm."}`,
    o, p, oRed, pRed
  }
}

export function dailyAssignment(user){
  const key = `mg_daily_${new Date().toISOString().slice(0,10)}`;
  const has = typeof window!=='undefined' ? localStorage.getItem(key) : null;
  if (has) return JSON.parse(has);
  const focus = (typeof window!=='undefined' && localStorage.getItem('mg_pain_focus')) || 'self';
  const bucket = assignments[
    focus === 'Money stress' ? 'money' :
    focus === 'Relationship loop' ? 'love' :
    focus === 'Health / grief' ? 'health' : 'self'
  ];
  const pick = rand(bucket);
  const pack = { focus, ...pick };
  if (typeof window!=='undefined') localStorage.setItem(key, JSON.stringify(pack));
  return pack;
}

export function genieReply({ input='', user={} }){
  const name = user.firstName || user.name || 'Friend';
  const tier = (typeof window!=='undefined' && localStorage.getItem('mg_tier')) || 'beginner';
  const focus = (typeof window!=='undefined' && localStorage.getItem('mg_pain_focus')) || 'self';

  const mood = detectMood(input);
  const theme = detectTheme(input, focus);
  const q = rand(quips[mood] || quips.neutral);
  const s = rand(secrets[theme] || secrets.self);
  const assign = rand(assignments[theme] || assignments.self);
  const numerix = numerologyDownload(name);
  const angel = angelHint();

  // Build multi-layer message
  let surface = q;
  let secret = s;
  let assignment = `**${assign.title}** — ${assign.why}\n• ${assign.steps.join('\n• ')}`;
  let numerology = numerix.text;

  // Optional wit tweak using the user's word
  if (/whack/i.test(input)) {
    surface = "“Whack,” huh? Cute. I bite back with blessings.";
  }

  const blocks = [
    surface,
    secret,
    assignment,
    `Name key for **${title(name)}** → ${numerology}`,
    angel ? angel : null
  ].filter(Boolean);

  const full = insertSparkles(blocks.join('\n\n'));

  // Hints for the UI
  const panic = theme==='money' && /broke|panic|rent|card|bill|declin/.test(input.toLowerCase());
  return {
    mood, theme, tier, focus,
    segments: { surface, secret, assignment, numerology, angel },
    text: full,
    suggestReset: !!panic,
  };
}
