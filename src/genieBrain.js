// src/genieBrain.js
// Manifestation Genie — Human + Witty + Simple
// - Plain English (≈5th grade), short sentences, 0–1 emoji.
// - Light, playful comebacks when user pokes the Genie.
// - Clear micro-steps per theme. Avoid repeat within a day.
// - Optional chunked output (res.chunks) for "typing" UX.

// ---------- utils
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const title = (s='') => s.charAt(0).toUpperCase() + s.slice(1);
const lettersOnly = (s='') => (s||'').replace(/[^a-z]/gi,'').toUpperCase();
const clamp = (n,min,max) => Math.max(min, Math.min(max, n));

function trimSentences(text, maxSentences=3) {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.slice(0, maxSentences).join(' ');
}
function withOneEmoji(text, want=true) {
  if (!want) return text.replace(/\p{Extended_Pictographic}/gu, '');
  const emojis = [...text.matchAll(/\p{Extended_Pictographic}/gu)].map(m=>m[0]);
  if (emojis.length <= 1) return text;
  let kept = false;
  return text.replace(/\p{Extended_Pictographic}/gu, () => {
    if (kept) return '';
    kept = true; return emojis[0];
  });
}
function todayKey(s) {
  return `${s}_${new Date().toISOString().slice(0,10)}`;
}

// ---------- numerology (kept, simplified)
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
function numerologyTip(n){
  if (n===4) return 'Build one small thing today.';
  if (n===8) return 'Make one clear money move.';
  if (n===7) return 'Spend 10 minutes in quiet focus.';
  if (n===3) return 'Express yourself once today.';
  return 'Keep a steady rhythm.';
}
function numerologyDownload(name=''){
  const o = ordinalSum(name), p = pythagoreanSum(name);
  const oRed = reduceToDigit(o), pRed = reduceToDigit(p);
  return {
    text: `Name code: Ordinal ${o} → ${oRed}, Pythagorean ${p} → ${pRed}. Tip: ${numerologyTip(oRed)}`,
    o,p,oRed,pRed
  };
}

// ---------- angel numbers
const angelMap = {
  111:"You’re aligned. Pick a path and move.",
  222:"Balance and trust. Keep one good habit.",
  333:"Create and share one small thing.",
  444:"You’re safe. Picture a gold shield around your goal.",
  555:"Change is here. Say yes to one new step.",
  666:"Stay grounded. Bring your body with the plan.",
  777:"Quiet time. Study yourself for 10 minutes.",
  888:"Power and money flow. Make one clear ask.",
  999:"Finish one thing you’ve been putting off."
};
function isAngelNumber(s=''){
  const t = (s||'').trim();
  return /^\d+$/.test(t) && angelMap[t] ? t : null;
}
function angelHint(){
  const now = new Date();
  const mm = String(now.getMinutes()).padStart(2,'0');
  const hh = String(now.getHours()).padStart(2,'0');
  const stamp = `${hh}:${mm}`;
  const map = {
    '11':"Good time to set a clear intent.",
    '22':"Lay one simple brick toward your goal.",
    '33':"Teach or share one truth.",
    '44':"Picture a shield of light around your plan."
  };
  return map[mm] ? `It’s ${stamp}. ${map[mm]}` : null;
}

// ---------- theme detection
const MONEY = /(money|broke|debt|bill|rent|job|sales|client|cash|declin|pay|invoice|bank)/i;
const LOVE  = /(love|relationship|ex|alone|dating|attract|partner|boyfriend|girlfriend|crush|breakup)/i;
const HEALTH= /(health|sick|ill|body|pain|stress|anxiety|panic|sleep|weight|grief|tired)/i;

function detectTheme(text='', fallback='self'){
  const t = (text||'').toLowerCase();
  if (MONEY.test(t)) return 'money';
  if (LOVE.test(t))  return 'love';
  if (HEALTH.test(t))return 'health';
  return fallback || 'self';
}

// ---------- wit layer (playful, never mean)
const TAUNT = /(dumb|stupid|not\s*smart|lame|boring|whack|useless|trash|bad bot|you suck)/i;
const CHALLENGE = /(prove|show me|bet|can you even|do better)/i;
const PRAISE = /(nice|thanks|thank you|good job|love this|awesome|great)/i;

const comebacks = {
  taunt: [
    "Careful—insulting a Genie is how you get extra homework. 😉",
    "Spicy. I’ll turn that into fuel. Watch.",
    "Bold move. Let me show you something simple that works."
  ],
  challenge: [
    "Deal. I’ll give you one clean move.",
    "Challenge accepted. Short and sharp:",
    "Okay, let’s make this count."
  ],
  praise: [
    "Glad it helps. Let’s stack one more small win.",
    "Thanks! Ready for the next tiny step?",
    "Sweet. Keep the momentum."
  ]
};

function detectWitCue(text=''){
  if (TAUNT.test(text)) return 'taunt';
  if (CHALLENGE.test(text)) return 'challenge';
  if (PRAISE.test(text)) return 'praise';
  return null;
}

// ---------- voice banks (simple + varied)
const openings = {
  money: [
    "Got it. Let’s help your money today.",
    "I hear you. Let’s make money feel easier.",
    "Okay. We’ll focus on money now."
  ],
  love: [
    "Okay. Let’s make love feel lighter.",
    "I hear you. We’ll warm up your love life.",
    "Got it. We’ll make room for better love."
  ],
  health: [
    "Okay. Let’s help your body feel safer.",
    "I hear you. We’ll lower stress in your body.",
    "Got it. Gentle steps for health."
  ],
  self: [
    "Okay. Let’s make today simpler.",
    "I’m with you. We’ll build a small win.",
    "Got it. One clear move coming up."
  ]
};

const microSteps = {
  money: [
    ["Open your messages.", "Send one note that could bring money.", "Be kind and clear. Then breathe out."],
    ["Hold a coin or card.", "Breathe out slow.", "Say: “I’m ready to receive.”"],
    ["Look at one bill for 60 seconds.", "Name one good thing it paid for.", "Say: “I can handle this one step.”"]
  ],
  love: [
    ["Relax your shoulders.", "Write one honest line you wish you could say.", "Read it to yourself with care."],
    ["Stand at the mirror.", "Half-smile at yourself.", "Say: “I’m easy to be with.”"],
    ["List 3 things you enjoy solo.", "Pick one and do it today.", "Let your mood rise first."]
  ],
  health: [
    ["Hand on heart.", "Inhale 4, exhale 6 — seven times.", "Say: “My body is safe right now.”"],
    ["Drink a glass of water.", "Step outside for fresh air.", "Stretch for 30 seconds."],
    ["Write one worry on paper.", "Circle it once.", "Say: “I see you. I’m okay.”"]
  ],
  self: [
    ["Pick one tiny task (2–5 min).", "Do it now.", "Mark it done and smile."],
    ["Tidy one small spot.", "Stop when the timer hits 3 minutes.", "Notice the calm."],
    ["Write your name.", "Underline it once.", "Say: “I allow good things.”"]
  ]
};

const closers = [
  "Small steps win. I’m proud of you.",
  "One move today is enough.",
  "You’ve got this. Keep it light."
];

// avoid repeating the same step set within a day
function pickSteps(theme) {
  const key = todayKey(`mg_steps_${theme}`);
  try {
    const used = typeof window!=='undefined' ? JSON.parse(localStorage.getItem(key) || '[]') : [];
    const bank = microSteps[theme] || microSteps.self;
    const choices = bank.filter((s,idx)=>!used.includes(idx));
    const idx = choices.length ? bank.indexOf(rand(choices)) : Math.floor(Math.random()*bank.length);
    const steps = bank[idx];
    if (typeof window!=='undefined') {
      const nextUsed = Array.from(new Set([...(used||[]), idx])).slice(-bank.length);
      localStorage.setItem(key, JSON.stringify(nextUsed));
    }
    return steps;
  } catch {
    return rand(microSteps[theme] || microSteps.self);
  }
}

// Build a short assignment
function buildAssignment(theme='self') {
  const steps = pickSteps(theme);
  return `Try this:\n• ${steps[0]}\n• ${steps[1]}\n• ${steps[2]}`;
}

// ---------- public: dailyAssignment
export function dailyAssignment(user={}){
  const key = `mg_daily_${new Date().toISOString().slice(0,10)}`;
  const saved = typeof window!=='undefined' ? localStorage.getItem(key) : null;
  if (saved) return JSON.parse(saved);

  const focus = (typeof window!=='undefined' && localStorage.getItem('mg_pain_focus')) || 'self';
  const theme = ['money','love','health','self'].includes(focus) ? focus :
    (focus==='Money stress' ? 'money' :
     focus==='Relationship loop' ? 'love' :
     focus==='Health / grief' ? 'health' : 'self');

  const pack = {
    focus: theme,
    title: 'Today’s tiny win',
    why: 'Small moves stack fast.',
    steps: pickSteps(theme)
  };
  if (typeof window!=='undefined') localStorage.setItem(key, JSON.stringify(pack));
  return pack;
}

/**
 * genieReply
 * @param {object} params
 *   - input: user text
 *   - user: { firstName?: string, name?: string }
 *   - opts: { emoji?: boolean, chunks?: boolean }
 * @returns {object} { text, chunks[], mood, theme, segments{ opening, assignment, numerology, angel, closer, comeback } }
 */
export function genieReply({ input='', user={}, opts={} }){
  const name = user.firstName || user.name || 'Friend';
  const wantEmoji = opts.emoji !== false; // allow one emoji by default
  const pref = (typeof window!=='undefined' && localStorage.getItem('mg_pain_focus')) || 'self';
  const themePref = (pref==='Money stress' ? 'money' : pref==='Relationship loop' ? 'love' : pref==='Health / grief' ? 'health' : pref);
  const theme = detectTheme(input, themePref);

  // witty cue
  const cue = detectWitCue(input);

  // Angel-number fast path
  const angelNum = isAngelNumber(input);
  if (angelNum){
    const open = `You called ${angelNum}. ${angelMap[angelNum]}`;
    const numerix = numerologyDownload(name);
    const clock = angelHint();
    const parts = [open, numerix.text, clock || '', rand(closers)];
    const chunks = parts.filter(Boolean).map(s => trimSentences(withOneEmoji(s, wantEmoji), 2));
    const text = chunks.join('\n\n');
    return {
      mood:'neutral', theme:'self',
      segments: { opening: chunks[0]||'', assignment:'', numerology:numerix.text, angel:clock||'', closer:chunks.at(-1)||'', comeback:'' },
      chunks, text
    };
  }

  // Normal path
  const opening = cue ? rand(comebacks[cue]) : rand(openings[theme] || openings.self);
  const assignment = buildAssignment(theme);
  const numerix = numerologyDownload(name);
  const maybeAngel = angelHint();
  const closer = rand(closers);

  const parts = [
    `${opening}${wantEmoji ? ' 🙂' : ''}`,
    assignment,
    `Name note for ${title(name)}: ${numerix.text}`,
    maybeAngel ? maybeAngel : null,
    closer
  ].filter(Boolean);

  const chunks = parts.map(p => trimSentences(withOneEmoji(p, wantEmoji), 3));
  const finalChunks = chunks.slice(0, clamp(3, 2, 4)); // keep it punchy

  return {
    mood: cue ? 'spicy' : 'neutral',
    theme,
    segments: {
      opening: finalChunks[0] || '',
      assignment: finalChunks[1] || '',
      numerology: numerix.text,
      angel: maybeAngel || '',
      closer: finalChunks[2] || '',
      comeback: cue ? opening : ''
    },
    chunks: finalChunks,
    text: finalChunks.join('\n\n')
  };
}
