// src/genieBrain.js
// Manifestation Genie — Personality Engine (human, simple, warm)
// Goals:
// - Plain English (≈5th grade). No jargon. No rituals.
// - 0–1 emoji max, only if it adds warmth.
// - 1–3 short paragraphs max.
// - Optional chunked output for "typing" UX: res.chunks = ["...", "...", "..."]

// ——— Utilities
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const title = (s='') => s.charAt(0).toUpperCase() + s.slice(1);
const lettersOnly = (s='') => (s||'').replace(/[^a-z]/gi,'').toUpperCase();
const clamp = (n,min,max) => Math.max(min, Math.min(max, n));

// Soft length helper: trims to N sentences max
function trimSentences(text, maxSentences=3) {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.slice(0, maxSentences).join(' ');
}

// Emoji gate: keep at most one friendly emoji
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

// ——— Numerology (kept, but simplified output)
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
  return 'Let today follow a steady rhythm.';
}
function numerologyDownload(name=''){
  const o = ordinalSum(name), p = pythagoreanSum(name);
  const oRed = reduceToDigit(o), pRed = reduceToDigit(p);
  return {
    text: `Your name code: Ordinal ${o} → ${oRed}, Pythagorean ${p} → ${pRed}. Tip: ${numerologyTip(oRed)}`,
    o,p,oRed,pRed
  };
}

// ——— Angel numbers (kept, 1-line friendly)
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
    '11':"A good moment to set a clear intent.",
    '22':"Lay one simple brick toward your goal.",
    '33':"Teach or share one truth.",
    '44':"Picture a shield of light around your plan."
  };
  return map[mm] ? `It’s ${stamp}. ${map[mm]}` : null;
}

// ——— Theme detection (very light-touch)
const MONEY = /(money|broke|debt|bill|rent|job|sales|client|cash|declin)/i;
const LOVE  = /(love|relationship|ex|alone|dating|attract|partner|boyfriend|girlfriend|crush)/i;
const HEALTH= /(health|sick|ill|body|pain|stress|anxiety|panic|sleep|weight|grief)/i;

function detectTheme(text='', fallback='self'){
  const t = (text||'').toLowerCase();
  if (MONEY.test(t)) return 'money';
  if (LOVE.test(t))  return 'love';
  if (HEALTH.test(t))return 'health';
  return fallback || 'self';
}

// ——— Simple, human guidance banks
const openings = {
  money: [
    "Got it. Let’s help your money today.",
    "I hear you. Let’s make money feel easier.",
    "Okay. We’ll focus on money now."
  ],
  love: [
    "Okay. Let’s make love feel lighter.",
    "I hear you. Let’s warm up your love life.",
    "Got it. We’ll make room for better love."
  ],
  health: [
    "Okay. Let’s help your body feel safer.",
    "I hear you. We’ll take gentle steps for health.",
    "Got it. We’ll lower the stress in your body."
  ],
  self: [
    "Okay. Let’s make today simpler.",
    "I’m with you. We’ll build a small win.",
    "Got it. Let’s give you one clear move."
  ]
};

const microSteps = {
  money: [
    ["Take a slow breath.", "Look at one bill or app for 60 seconds.", "Say: “I can handle this one step.”"],
    ["Send one message that could bring money.", "Keep it simple and kind.", "Then take a short walk."],
    ["Put a coin in your hand.", "Breathe out slow.", "Say: “I’m ready to receive.”"]
  ],
  love: [
    ["Relax your shoulders.", "Send one honest message or write it for yourself.", "Say: “I choose people who choose me.”"],
    ["List 3 things you enjoy that don’t need anyone else.", "Do one today.", "Let your mood rise first."],
    ["Stand in front of a mirror.", "Half-smile at yourself.", "Say: “I’m easy to be with.”"]
  ],
  health: [
    ["Hand on heart.", "Inhale 4, exhale 6 — seven times.", "Say: “My body is safe right now.”"],
    ["Drink a glass of water.", "Step outside for fresh air.", "Stretch for 30 seconds."],
    ["Write one worry on paper.", "Circle it once.", "Say: “I see you. I’m okay.”"]
  ],
  self: [
    ["Pick one tiny task (2–5 min).", "Do it now.", "Mark it done and smile."],
    ["Tidy one small area.", "Stop when the timer hits 3 minutes.", "Notice the calm."],
    ["Write your name.", "Underline it once.", "Say: “I allow good things.”"]
  ]
};

const closers = [
  "Small steps count most. I’m proud of you.",
  "One move today is enough.",
  "You’ve got this. Keep it light."
];

// Build a short, warm assignment block
function buildAssignment(theme='self') {
  const steps = rand(microSteps[theme] || microSteps.self);
  // Make bullets readable for 5th grade
  const lines = steps.map(s => `• ${s}`);
  return `Try this:\n${lines.join('\n')}`;
}

// ——— Public API
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
    steps: rand(microSteps[theme] || microSteps.self)
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
 * @returns {object} { text, chunks[], mood, theme, segments{ opening, assignment, numerology, angel, closer } }
 */
export function genieReply({ input='', user={}, opts={} }){
  const name = user.firstName || user.name || 'Friend';
  const wantEmoji = opts.emoji !== false; // default: allow one emoji at most
  const themePref = (typeof window!=='undefined' && localStorage.getItem('mg_pain_focus')) || 'self';
  const theme = detectTheme(input, themePref==='Money stress' ? 'money' :
                                   themePref==='Relationship loop' ? 'love'  :
                                   themePref==='Health / grief' ? 'health' : 'self');

  // Fast path: angel number
  const angelNum = isAngelNumber(input);
  if (angelNum){
    const open = `You called ${angelNum}. ${angelMap[angelNum]}`;
    const numerix = numerologyDownload(name);
    const clock = angelHint();
    let lines = [open, numerix.text];
    if (clock) lines.push(clock);
    const chunks = lines.map(s => trimSentences(withOneEmoji(s, wantEmoji), 2));
    const text = chunks.join('\n\n');
    return {
      mood: 'neutral',
      theme: 'self',
      segments: { opening: chunks[0], assignment:'', numerology:numerix.text, angel:clock || '', closer:'' },
      chunks,
      text
    };
  }

  // Normal path: 3 compact parts
  const opening = rand(openings[theme] || openings.self);
  const assignment = buildAssignment(theme);
  const numerix = numerologyDownload(name);
  const closer = rand(closers);
  const maybeAngel = angelHint();

  // Keep everything plain, short, warm
  const parts = [
    `${opening}${wantEmoji ? ' 🙂' : ''}`,
    assignment,
    `Name note for ${title(name)}: ${numerix.text}`,
    maybeAngel ? maybeAngel : null,
    closer
  ].filter(Boolean);

  // Trim each part to a few sentences and enforce emoji rule
  const chunks = parts.map(p => trimSentences(withOneEmoji(p, wantEmoji), 3));

  // Hard cap: 3 short paragraphs (opening, steps, closer or name note)
  const maxPara = 3;
  const finalChunks = chunks.slice(0, clamp(maxPara, 2, 4));

  return {
    mood: 'neutral',
    theme,
    segments: {
      opening: finalChunks[0] || '',
      assignment: finalChunks[1] || '',
      numerology: numerix.text,
      angel: maybeAngel || '',
      closer: finalChunks[2] || ''
    },
    chunks: finalChunks,
    text: finalChunks.join('\n\n')
  };
}
