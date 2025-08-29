// src/genieBrain.js
// Manifestation Genie — Personality Engine (wit + mysticism + assignments + numerology + angel numbers)

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const title = (s='') => s.charAt(0).toUpperCase() + s.slice(1);
const lettersOnly = (s='') => (s||'').replace(/[^a-z]/gi,'').toUpperCase();

function ordinalSum(name=''){
  const clean = lettersOnly(name); let sum = 0;
  for (let i=0;i<clean.length;i++) sum += (clean.charCodeAt(i)-64);
  return sum || 0;
}
function pythagoreanSum(name=''){
  const map = {A:1,J:1,S:1,B:2,K:2,T:2,C:3,L:3,U:3,D:4,M:4,V:4,E:5,N:5,W:5,F:6,O:6,X:6,G:7,P:7,Y:7,H:8,Q:8,Z:8,I:9,R:9};
  const clean = lettersOnly(name); let sum = 0;
  for (let i=0;i<clean.length;i++) sum += map[clean[i]]||0;
  return sum || 0;
}
function reduceToDigit(n){
  const masters = new Set([11,22,33]);
  while (n>9 && !masters.has(n)) n = n.toString().split('').reduce((a,b)=>a+parseInt(b,10),0);
  return n;
}
function angelHint(){
  const now = new Date(), mm = String(now.getMinutes()).padStart(2,'0');
  const stamp = `${String(now.getHours()).padStart(2,'0')}:${mm}`;
  const map = { '11':"11:11 window cracked open. Say it out loud.", '22':"Master-builder hour — choose one concrete step.", '33':"Teacher code — share one truth today.", '44':"Protection grid — gold light around your goal." };
  return map[mm] ? `It’s ${stamp}. ${map[mm]} ✨` : null;
}
function insertSparkles(text){
  const glyphs = ['✨','🔮','🔥','🌙','🜚','⚡'];
  return text.replace(/\.\s|;\s|—\s/g, () => ` ${rand(glyphs)} `);
}

// —— Tone & Theme
const NEG = /(whack|lame|boring|stuck|broke|anxious|panic|overwhelmed|tired|hopeless|hate|declined|rent|bill)/i;
const LOVE = /(love|relationship|ex|alone|dating|attract|soulmate)/i;
const MONEY = /(money|broke|debt|bill|rent|job|sales|clients|cash|declined)/i;
const HEALTH = /(health|sick|ill|grief|body|pain|stress|anxiety|panic)/i;

function detectMood(text=''){
  const t = text.toLowerCase();
  if (NEG.test(t)) return 'neg';
  if (t.includes('?')) return 'curious';
  if (t.trim().length < 6) return 'blunt';
  return 'neutral';
}
function detectTheme(text='', fallback=''){
  const t = text.toLowerCase();
  if (MONEY.test(t) || fallback==='Money stress') return 'money';
  if (LOVE.test(t) || fallback==='Relationship loop') return 'love';
  if (HEALTH.test(t) || fallback==='Health / grief') return 'health';
  return 'self';
}

// —— Banks
const quips = {
  neg: [
    "“Whack,” you say? Careful — words are spells. You just smacked the lamp, mortal. 😏",
    "Bold insult for someone I’m actively upgrading. Lightning or lesson first?",
    "If you call the river ‘dry,’ don’t pout when it withholds the tide."
  ],
  blunt: [
    "One word? Very oracle-core. I’ll answer in riddles.",
    "Minimalist poetry. Watch this.",
    "Short word. Long magic."
  ],
  curious: [
    "Questions open doors the obedient never find.",
    "Curiosity is the locksmith of reality.",
    "Ask and I unbolt the next mechanism."
  ],
  neutral: [
    "I hear the pulse beneath your words.",
    "Noted. I’ll tilt the probabilities.",
    "Your breath moved the field. Let’s shape it."
  ]
};

const secrets = {
  money: [
    "Money isn’t a reward — it’s a **routing signal** toward usefulness your nervous system permits.",
    "Scarcity is a **memorized emergency**. We reset the alarm and doors unlock.",
    "The mind hunts numbers; the body hunts **safety**. Give it safety and numbers hunt you."
  ],
  love: [
    "Attachment tries to *hold* love; magnetism **makes space** and love lands.",
    "You don’t manifest a person; you tune to a pattern where that person is obvious.",
    "Obsession shouts; attraction **whispers**. We quiet you so you can hear it."
  ],
  health: [
    "Your body stores unsaid sentences. Speak them and symptoms loosen.",
    "Positivity isn’t healing — **permission** is. Allow, then alchemize.",
    "Pain is the messenger; we thank it, then reroute the message."
  ],
  self: [
    "Thoughts don’t create alone — **state** does. Change state; thought obeys.",
    "Affirmations are seeds; the **soil** is your nervous system.",
    "Reality mirrors the *dominant felt story*, not the loudest thought."
  ]
};

const assignments = {
  money: [
    { title:"Coin Nerve Reset (3 min)", why:"Teaches your body that money talk = safe.", steps:[
      "Hold any coin/card. Exhale 7 counts.", "Whisper: “I am safe to receive while still me.”", "Place the coin down with care — feel completion."
    ]},
    { title:"Receipts to Riches (5 min)", why:"Turns bills into proof of flow.", steps:[
      "Open one bill; name **one benefit** it enabled.", "Say: “Thank you for the flow already moving.”", "Picture next payment gliding out, then back 3× bigger."
    ]}
  ],
  love: [
    { title:"Attachment Unhook (4 min)", why:"Space invites the new pattern.", steps:[
      "Write their name; draw a small open circle beside it.", "Breathe 9 counts; soften shoulders.", "Say: “I release the *grip*, not the desire.” Burn/tear."
    ]},
    { title:"Mirror Warmth (2 min)", why:"Pairs your face with safety; boosts magnetism.", steps:[
      "Look at yourself; half-smile.", "Say: “I am easy to love because I am easy with me.”"
    ]}
  ],
  health: [
    { title:"Permission Breath (3 min)", why:"Signals parasympathetic access.", steps:[
      "Hand on heart, inhale 4 / exhale 6 ×7.", "Whisper what hurts without fixing it.", "Say: “Message received.”"
    ]}
  ],
  self: [
    { title:"Name Sigil (2 min)", why:"Your name holds your **operating code**.", steps:[
      "Write your name in gold (pen/phone).", "Underline once; touch it; breathe.", "Say: “I authorize upgrade.”"
    ]}
  ]
};

// —— Numerology & Angel numbers
function numerologyDownload(name=''){
  const o = ordinalSum(name), p = pythagoreanSum(name);
  const oRed = reduceToDigit(o), pRed = reduceToDigit(p);
  const tip = (n)=>{
    if (n===4) return "4 = Builder code — lay one brick today.";
    if (n===8) return "8 = Power/material mastery — make one decisive ask.";
    if (n===7) return "7 = Inner laboratory — study your signal for 11 minutes.";
    if (n===3) return "3 = Expression — ship one imperfect message.";
    return "Let today reflect this number’s rhythm.";
  };
  return {
    text: `Name code: Ordinal **${o} → ${oRed}**, Pythagorean **${p} → ${pRed}**. ${tip(oRed)}`,
    o,p,oRed,pRed
  }
}

const angelMap = {
  111:"Alignment ping — choose, don’t chase.",
  222:"Stability and pairing — anchor one supportive habit.",
  333:"Creative surge — teach/share one truth today.",
  444:"Protection grid — imagine gold light around your goal.",
  555:"Change portal — say yes to one new path.",
  666:"Integration — bring the body with the vision.",
  777:"Inner lab — study your signal for 11 minutes.",
  888:"Power + material flow — make one ask, send one invoice, raise one price.",
  999:"Completion — close one loop you’ve avoided."
};

function isAngelNumber(s=''){
  const t = s.trim();
  return /^\d+$/.test(t) && angelMap[t] ? t : null;
}

// —— Public API
export function dailyAssignment(user){
  const key = `mg_daily_${new Date().toISOString().slice(0,10)}`;
  const saved = typeof window!=='undefined' ? localStorage.getItem(key) : null;
  if (saved) return JSON.parse(saved);
  const focus = (typeof window!=='undefined' && localStorage.getItem('mg_pain_focus')) || 'self';
  const bucket = assignments[
    focus==='Money stress' ? 'money' : focus==='Relationship loop' ? 'love' : focus==='Health / grief' ? 'health' : 'self'
  ];
  const pick = rand(bucket);
  const pack = { focus, ...pick };
  if (typeof window!=='undefined') localStorage.setItem(key, JSON.stringify(pack));
  return pack;
}

export function genieReply({ input='', user={} }){
  const name = user.firstName || user.name || 'Friend';
  const tier  = (typeof window!=='undefined' && localStorage.getItem('mg_tier')) || 'beginner';
  const focus = (typeof window!=='undefined' && localStorage.getItem('mg_pain_focus')) || 'self';

  // Angel-number fast path
  const angelNum = isAngelNumber(input);
  if (angelNum){
    const tip = angelMap[angelNum];
    const numerix = numerologyDownload(name);
    const angel = angelHint();
    const text = insertSparkles([
      `You called **${angelNum}**. ${tip}`,
      `Name key for **${title(name)}** → ${numerix.text}`,
      angel ? angel : null
    ].filter(Boolean).join('\n\n'));
    return { mood:'neutral', theme:'self', tier, focus, segments:{ surface:`Angel ${angelNum}`, secret:tip, assignment:'', numerology:numerix.text, angel }, text, suggestReset:false };
  }

  // Normal path
  const mood  = detectMood(input);
  const theme = detectTheme(input, focus);
  let surface = rand(quips[mood] || quips.neutral);
  if (/whack/i.test(input)) surface = "“Whack,” huh? Cute. I bite back with blessings.";
  const secret = rand(secrets[theme] || secrets.self);
  const assign = rand(assignments[theme] || assignments.self);
  const numerix = numerologyDownload(name);
  const angel = angelHint();

  const assignment = `**${assign.title}** — ${assign.why}\n• ${assign.steps.join('\n• ')}`;
  const numerology = `Name key for **${title(name)}** → ${numerix.text}`;

  const text = insertSparkles([surface, secret, assignment, numerology, angel?angel:null].filter(Boolean).join('\n\n'));

  const panic = theme==='money' && /(broke|panic|rent|bill|declin)/i.test(input);
  return {
    mood, theme, tier, focus,
    segments: { surface, secret, assignment, numerology, angel },
    text,
    suggestReset: !!panic,
  };
}
