// src/genieBrain.js
// Manifestation Genie — Human + Witty + Simple + Multi-bubble
// Hybrid: banked voice + optional AI improv metaphor (via /api/metaphor)
// Output: { bubbles[], chunks[], text, segments, theme, mood }

//////////////////// CONFIG ////////////////////
const CONFIG = {
  allowEmoji: true,            // false = strip all emojis
  wittyComebacks: true,        // false = no taunt/challenge/praise comebacks
  includeRoastLoA: true,       // false = no light roast of LOA gurus
  includeNumerology: true,     // show the short name note bubble
  includeAngelHint: true,      // show subtle time-based hint
  maxBubbles: 6,               // hard cap (we usually send 5–6)
  metaphorTimeoutMs: 1200,     // abort /api/metaphor if slow
  phraseSprinkleChance: 0.25,  // chance to append one of your phrases
};

//////////////////// UTILS ////////////////////
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const title = (s='') => s.charAt(0).toUpperCase() + s.slice(1);
const lettersOnly = (s='') => (s||'').replace(/[^a-z]/gi,'').toUpperCase();
const clamp = (n,min,max) => Math.max(min, Math.min(max, n));

function trimSentences(text, maxSentences=2) {
  const parts = (text||'').split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.slice(0, maxSentences).join(' ');
}
function withOneEmoji(text, want=true) {
  if (!want) return text.replace(/\p{Extended_Pictographic}/gu, '');
  const emojis = [...(text.matchAll(/\p{Extended_Pictographic}/gu) || [])].map(m=>m[0]);
  if (emojis.length <= 1) return text;
  let kept = false;
  return text.replace(/\p{Extended_Pictographic}/gu, () => (kept ? '' : (kept = true, emojis[0])));
}
function todayKey(s) { return `${s}_${new Date().toISOString().slice(0,10)}`; }

//////////////////// YOUR VOICE DNA ////////////////////
// Edit these or set localStorage.mg_user_phrases = "no bs, keep it real, facts only, ..."
// (comma- or newline-separated)
const DEFAULT_USER_PHRASES = [
  "no bs", "keep it real", "facts only", "straight up",
  "zero fluff", "don’t get it twisted", "here’s the real play",
  "blow your mind", "get my drift?"
];
function getUserPhrases(){
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('mg_user_phrases') || '';
      const list = raw.split(/[\n,]/).map(s=>s.trim()).filter(Boolean);
      return list.length ? list : DEFAULT_USER_PHRASES;
    }
  } catch {}
  return DEFAULT_USER_PHRASES;
}
function sprinklePhrase(line){
  if (Math.random() > CONFIG.phraseSprinkleChance) return line;
  const ph = rand(getUserPhrases());
  return `${line} — ${ph}`;
}

//////////////////// NUMEROLOGY ////////////////////
function ordinalSum(name=''){ const c = lettersOnly(name); let s=0; for (let i=0;i<c.length;i++) s+=(c.charCodeAt(i)-64); return s||0; }
function pythagoreanSum(name=''){
  const map = {A:1,J:1,S:1,B:2,K:2,T:2,C:3,L:3,U:3,D:4,M:4,V:4,E:5,N:5,W:5,F:6,O:6,X:6,G:7,P:7,Y:7,H:8,Q:8,Z:8,I:9,R:9};
  const c = lettersOnly(name); let s=0; for (let i=0;i<c.length;i++) s+=(map[c[i]]||0); return s||0;
}
function reduceToDigit(n){ const m=new Set([11,22,33]); while(n>9 && !m.has(n)) n=String(n).split('').reduce((a,b)=>a+parseInt(b,10),0); return n; }
function numerologyTip(n){
  if (n===4) return 'Build one small thing today.';
  if (n===8) return 'Make one clear money move.';
  if (n===7) return 'Spend 10 minutes in quiet focus.';
  if (n===3) return 'Express yourself once today.';
  return 'Keep a steady rhythm.';
}
function numerologyDownload(name=''){
  const o=ordinalSum(name), p=pythagoreanSum(name);
  const oRed=reduceToDigit(o), pRed=reduceToDigit(p);
  return { text:`Name code: Ordinal ${o} → ${oRed}, Pythagorean ${p} → ${pRed}. Tip: ${numerologyTip(oRed)}`, o,p,oRed,pRed };
}

//////////////////// ANGEL NUMBERS ////////////////////
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
function isAngelNumber(s=''){ const t=(s||'').trim(); return /^\d+$/.test(t) && angelMap[t] ? t : null; }
function angelHint(){
  if (!CONFIG.includeAngelHint) return null;
  const now=new Date(), mm=String(now.getMinutes()).padStart(2,'0'), hh=String(now.getHours()).padStart(2,'0');
  const map = { '11':"Good time to set a clear intent.", '22':"Lay one simple brick toward your goal.", '33':"Teach or share one truth.", '44':"Picture a shield of light around your plan." };
  return map[mm] ? `It’s ${hh}:${mm}. ${map[mm]}` : null;
}

//////////////////// THEME DETECTION ////////////////////
const MONEY = /(money|broke|debt|bill|rent|job|sales|client|cash|declin|pay|invoice|bank)/i;
const LOVE  = /(love|relationship|ex|alone|dating|attract|partner|boyfriend|girlfriend|crush|breakup)/i;
const HEALTH= /(health|sick|ill|body|pain|stress|anxiety|panic|sleep|weight|grief|tired)/i;
function detectTheme(text='', fallback='self'){
  const t=(text||'').toLowerCase();
  if (MONEY.test(t)) return 'money';
  if (LOVE.test(t))  return 'love';
  if (HEALTH.test(t))return 'health';
  return fallback || 'self';
}

//////////////////// WIT + ROASTS ////////////////////
const TAUNT = /(dumb|stupid|not\s*smart|lame|boring|whack|useless|trash|bad bot|you suck)/i;
const CHALLENGE = /(prove|show me|bet|can you even|do better)/i;
const PRAISE = /(nice|thanks|thank you|good job|love this|awesome|great)/i;

const remarks = [
  "Hmm, I see where you’re going with that.",
  "Spicy. Let’s unpack it.",
  "Okay, noted. Let’s keep it real.",
  "Alright — no fluff. Let’s move."
];

const comebacks = {
  taunt: [
    "Careful — insulting a Genie just gets you extra reps. 😉",
    "Bold talk. I’ll turn it into fuel. Watch.",
    "Cute jab. Here’s a clean move instead."
  ],
  challenge: [
    "Bet. I’ll make it simple and sharp.",
    "Deal. Short path coming up.",
    "Okay then — let’s test your courage."
  ],
  praise: [
    "Facts only. Let’s stack another win.",
    "Love that. Keep the pace.",
    "Good — now double it."
  ],
  roastLoa: [
    "Most gurus say “just visualize it.” Cool — I visualize pizza. Still gotta cook. 😂",
    "“High vibes only”? Try paying rent with vibes. I’ll wait.",
    "If positive thinking alone worked, every seminar line would be CEOs."
  ]
};
function detectWitCue(text=''){
  if (!CONFIG.wittyComebacks) return null;
  if (TAUNT.test(text)) return 'taunt';
  if (CHALLENGE.test(text)) return 'challenge';
  if (PRAISE.test(text)) return 'praise';
  return null;
}

//////////////////// MICRO-STEPS ////////////////////
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
  "One move today is enough.",
  "Small steps win. I’m proud of you.",
  "You’ve got this. Keep it light."
];

function pickSteps(theme) {
  const key = todayKey(`mg_steps_${theme}`);
  try {
    const used = typeof window!=='undefined' ? JSON.parse(localStorage.getItem(key) || '[]') : [];
    const bank = microSteps[theme] || microSteps.self;
    const choices = bank.filter((_,idx)=>!used.includes(idx));
    const idx = choices.length ? (bank.indexOf(rand(choices))) : Math.floor(Math.random()*bank.length);
    const steps = bank[idx];
    if (typeof window!=='undefined') {
      const nextUsed = Array.from(new Set([...(used||[]), idx])).slice(-bank.length);
      localStorage.setItem(key, JSON.stringify(nextUsed));
    }
    return steps;
  } catch { return rand(microSteps[theme] || microSteps.self); }
}
function buildAssignment(theme='self') {
  const s = pickSteps(theme);
  return `Try this:\n• ${s[0]}\n• ${s[1]}\n• ${s[2]}`;
}

//////////////////// QUESTIONS (poke the user) ////////////////////
const probe = {
  money: [
    "What’s one bold ask you’ve avoided?",
    "Where are you leaking time or cash daily?",
    "If you were an investor, would you fund your plan? Why?"
  ],
  love: [
    "What boundary would future-you enforce today?",
    "Who are you chasing that doesn’t choose you back?",
    "What makes you easy to be with — for you?"
  ],
  health: [
    "What tiny habit would calm your body the fastest?",
    "What’s one stressor you can remove this week?",
    "Where does your body say “no,” and you ignore it?"
  ],
  self: [
    "What’s the one task you keep dodging?",
    "What would a 10-minute version look like?",
    "If it were easy, what’s your first move?"
  ]
};

//////////////////// METAPHORS ////////////////////
const METAPHORS = {
  money: [
    "It’s a magnet — it sticks to steady metal, not shaking hands.",
    "It’s a river — dams (fear) block it; one gate open changes the valley.",
    "It’s a garden — invoices are seeds, follow-ups are water."
  ],
  love: [
    "It’s a radio — tune your station, the right song finds you.",
    "It’s a porch light — steady glow invites, not a searchlight that chases.",
    "It’s a swing — you can’t clutch both posts; loosen and move."
  ],
  health: [
    "It’s a thermostat — set calmer, the room follows.",
    "It’s a traffic light — red is a message, not an enemy.",
    "It’s a library — silence helps you find what hurts."
  ],
  self: [
    "It’s a slingshot — pull back with rest, then release.",
    "It’s a toolbox — you already own the wrench you need.",
    "It’s a lighthouse — small light, wide reach, one turn at a time."
  ]
};
async function improvMetaphor(topic, theme, name){
  // Optional AI improv via /api/metaphor  -> { metaphor: "..." }
  const fallback = `${rand(METAPHORS[theme] || METAPHORS.self)}`;
  try {
    if (typeof fetch !== 'function') return fallback;
    const ctrl = new AbortController();
    const timer = setTimeout(()=>ctrl.abort(), CONFIG.metaphorTimeoutMs);
    const r = await fetch('/api/metaphor', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ topic, theme, name }),
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (!r.ok) return fallback;
    const data = await r.json().catch(()=>({}));
    const m = (data && (data.metaphor || data.text)) || '';
    const clean = trimSentences(m || fallback, 2);
    return clean;
  } catch { return fallback; }
}

//////////////////// PUBLIC: dailyAssignment ////////////////////
export function dailyAssignment(user={}){
  const key = `mg_daily_${new Date().toISOString().slice(0,10)}`;
  const saved = typeof window!=='undefined' ? localStorage.getItem(key) : null;
  if (saved) return JSON.parse(saved);

  const focus = (typeof window!=='undefined' && localStorage.getItem('mg_pain_focus')) || 'self';
  const theme = ['money','love','health','self'].includes(focus) ? focus :
    (focus==='Money stress' ? 'money' :
     focus==='Relationship loop' ? 'love' :
     focus==='Health / grief' ? 'health' : 'self');

  const pack = { focus: theme, title: 'Today’s tiny win', why: 'Small moves stack fast.', steps: pickSteps(theme) };
  if (typeof window!=='undefined') localStorage.setItem(key, JSON.stringify(pack));
  return pack;
}

//////////////////// GENIE REPLY (multi-bubble) ////////////////////
/**
 * genieReply (async: metaphor may fetch)
 * @param {object} params
 *  - input: user text
 *  - user: { firstName?: string, name?: string }
 *  - opts: { emoji?: boolean }
 * @returns {Promise<{ bubbles: string[], chunks: string[], text: string, theme: string, mood: string, segments: any }>}
 */
export async function genieReply({ input='', user={}, opts={} }){
  const name = user.firstName || user.name || 'Friend';
  const wantEmoji = opts.emoji !== false && CONFIG.allowEmoji;
  const pref = (typeof window!=='undefined' && localStorage.getItem('mg_pain_focus')) || 'self';
  const themePref = (pref==='Money stress' ? 'money' : pref==='Relationship loop' ? 'love' : pref==='Health / grief' ? 'health' : pref);
  const theme = detectTheme(input, themePref);

  // Angel-number fast path = concise 3–4 bubbles
  const angelNum = isAngelNumber(input);
  if (angelNum){
    const b1 = sprinklePhrase(`You called ${angelNum}. ${angelMap[angelNum]}`);
    const numerix = numerologyDownload(name);
    const b2 = CONFIG.includeNumerology ? `Name note for ${title(name)}: ${numerix.text}` : null;
    const b3 = angelHint();
    const b4 = rand(closers);
    let bubbles = [b1, b2, b3, b4].filter(Boolean).map(s => trimSentences(withOneEmoji(s, wantEmoji), 2));
    bubbles = bubbles.slice(0, clamp(CONFIG.maxBubbles, 3, 6));
    return packReturn({ name, theme:'self', mood:'neutral', bubbles, numerix, angel:b3 || '' });
  }

  // Normal path
  const cue = detectWitCue(input);
  const opening = cue ? rand(comebacks[cue]) : rand(remarks);
  const mirror = `Alright ${title(name)}, you said: “${(input||'').trim()}”.`;
  const dive = `Let’s dive deeper into that.`;
  const roast = (CONFIG.includeRoastLoA && Math.random()<0.33) ? rand(comebacks.roastLoa) : null;
  const metaphor = await improvMetaphor(input, theme, name);
  const metaLine = `Picture it like this: ${metaphor}`;
  const step = buildAssignment(theme);
  const ask = rand(probe[theme] || probe.self);
  const numerix = numerologyDownload(name);
  const nameNote = CONFIG.includeNumerology ? `Name note for ${title(name)}: ${numerix.text}` : null;
  const clock = angelHint();
  const close = rand(closers);

  let bubbles = [
    sprinklePhrase(opening),
    mirror,
    dive,
    roast,
    metaLine,
    step,
    ask,
    nameNote,
    clock,
    close
  ].filter(Boolean).map(s => trimSentences(withOneEmoji(s, wantEmoji), 2));

  // keep natural size: 5–6 bubbles typical
  bubbles = bubbles.slice(0, clamp(CONFIG.maxBubbles, 4, 7));

  return packReturn({ name, theme, mood: cue ? 'spicy' : 'neutral', bubbles, numerix, angel: clock || '' });
}

function packReturn({ name, theme, mood, bubbles, numerix, angel }){
  const chunks = bubbles.slice(); // for streaming UI
  const text = bubbles.join('\n\n'); // backward compat
  return {
    theme, mood, bubbles, chunks, text,
    segments: {
      opening: bubbles[0] || '',
      metaphor: bubbles.find(b=>b.startsWith('Picture it like this:')) || '',
      assignment: bubbles.find(b=>b.startsWith('Try this:')) || '',
      question: bubbles.find(b=>probe.money.concat(probe.love,probe.health,probe.self).some(q => b.includes(q.slice(0,10)))) || '',
      numerology: numerix?.text || '',
      angel: angel || '',
      closer: bubbles.at(-1) || ''
    }
  };
}
