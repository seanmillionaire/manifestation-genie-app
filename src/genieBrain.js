// src/genieBrain.js
// Manifestation Genie — Human + Witty + Simple + Multi-bubble
// Hybrid: banked voice + optional AI improv metaphor (via /api/metaphor)
// Output: { bubbles[], chunks[], text, segments, theme, mood }

//////////////////// CONFIG ////////////////////
const CONFIG = {
  allowEmoji: true,
  wittyComebacks: true,
  includeRoastLoA: true,
  includeNumerology: true,
  includeAngelHint: true,
  maxBubbles: 6,
  metaphorTimeoutMs: 1200,
  phraseSprinkleChance: 0.25,

  // Intro copy (shown after lamp touch)
  intro: {
    line1: "Ah… the lamp warms in your palm. ✨",
    line2: "I am the Manifestation Genie — keeper of tiny moves that bend reality.",
    line3: "Speak your wish — a word, a sentence, a storm. I listen."
  }
};

//////////////////// UTIL ////////////////////
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
const DEFAULT_USER_PHRASES = [
  "Let it be easy.",
  "I don’t chase; I glow.",
  "Small moves, great spells.",
  "Momentum loves honesty.",
  "One message can change my month."
];
function getUserPhrases(){
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('mg_user_phrases') || '[]';
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return arr.filter(Boolean);
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
function ordinalSum(name=''){
  const c = lettersOnly(name);
  let s = 0;
  for (let i=0;i<c.length;i++) s += (c.charCodeAt(i)-64);
  return s || 0;
}
function pythagoreanSum(name=''){
  const map = {A:1,J:1,S:1,B:2,K:2,T:2,C:3,L:3,U:3,D:4,M:4,V:4,E:5,N:5,W:5,F:6,O:6,X:6,G:7,P:7,Y:7,H:8,Q:8,Z:8,I:9,R:9};
  const c = lettersOnly(name); let s=0; for (let i=0;i<c.length;i++) s+=(map[c[i]]||0); return s||0;
}
function reduceToDigit(n){
  const master = new Set([11,22,33]);
  while (n > 9 && !master.has(n)) n = String(n).split('').reduce((a,b)=>a+parseInt(b,10),0);
  return n;
}
function numerologyTip(n){
  if (n===1) return 'Lead with one decisive move.';
  if (n===2) return 'Partner up or ask for help.';
  if (n===3) return 'Publish a small creative piece.';
  if (n===4) return 'Set one strong boundary today.';
  if (n===5) return 'Try one fresh angle.';
  if (n===6) return 'Tend to your space; then act.';
  if (n===7) return 'Spend 10 minutes in quiet focus.';
  if (n===8) return 'Make a clean ask for value.';
  if (n===9) return 'Close one open loop with love.';
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
  const map = {
    '11':"Good time to set a clear intent.",
    '22':"Lay two bricks; balance is power.",
    '33':"Make something tiny and share it.",
    '44':"Picture a shield of light around your plan."
  };
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
// Simple profanity/junk net (kept minimal on purpose)
const PROFANITY = /\b(fuck|shit|bitch|asshole|cunt|dick|bastard|motherfucker)\b/i;

const remarks = [
  "Hmm, I see where you’re going with that.",
  "Alright — no fluff. Let’s move.",
  "I hear the signal through the noise.",
  "Got it. We’ll make this lighter."
];
const comebacks = {
  taunt: [
    "Cute spell. Here’s a stronger one: move your thumb and send the message.",
    "Talk is wind. Watch what one tiny action does.",
    "We both know you’re sharper than that."
  ],
  challenge: [
    "Deal. Give me one sentence of the wish and we’ll act.",
    "I accept. We prove it with a 60-second ritual.",
    "Good. Let’s test it in the real world today."
  ],
  praise: [
    "We love momentum. Keep it humming.",
    "Noted. Now stack it with one more move.",
    "Beautiful. Let’s lock it in with action."
  ]
};
function detectWitCue(text=''){
  if (TAUNT.test(text)) return 'taunt';
  if (CHALLENGE.test(text)) return 'challenge';
  if (PRAISE.test(text)) return 'praise';
  return null;
}

// Off-course detector: permissive for real goals, strict for junk/taunts
// Off-course detector: permissive for real goals, strict for junk/taunts
function isOffCourse(text = '') {
  const t = (text || '').trim();
  if (!t || t.length < 3) return true;
  if (TAUNT.test(t) || PROFANITY.test(t)) return true;
  if (!/[A-Za-z0-9]/.test(t)) return true;

  // Treat as valid goal if any of these are true:
  const looksMoney = /[$€£]\s*\d/.test(t) || /\b\d+(\.\d+)?\s*(k|m|million|thousand)\b/i.test(t);
  const hasPerTime = /\bper\s+(day|week|month|year)\b/i.test(t) || /\/\s*(day|wk|mo|yr|year|month)/i.test(t);
  const goalVerbs = /\b(i\s*)?(want|need|make|earn|land|get|grow|sell|buy|hit|reach|build|launch|save|close|book|sign|scale|publish|ship)\b/i.test(t);
  if (looksMoney || hasPerTime || goalVerbs) return false;

  const realWords = (t.match(/[A-Za-z]{3,}/g) || []).length;
  if (realWords >= 2) return false;
  return true;
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
    ["Pick the smallest next move.", "Do a 10-minute version.", "Mark it done with a ✅."],
    ["Clear one square foot of space.", "Set a 5-minute timer.", "Stop when it dings."],
    ["Message someone who supports you.", "Ask for one tiny thing.", "Say thanks out loud."]
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
    "It’s a compass — tiny turns change destiny.",
    "It’s a staircase — see only the next step, climb anyway.",
    "It’s a lens — clean it once and the world sharpens."
  ]
};

//////////////////// METAPHOR (optional remote improv) ////////////////////
// (Left as local bank above; /api/metaphor could be wired later)
async function improvMetaphor(theme='self', fallback='It’s a path — one steady step is enough.'){
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(()=>ctrl.abort(), CONFIG.metaphorTimeoutMs);
    const r = await fetch('/api/metaphor', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ theme }),
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

//////////////////// NEW: GENIE INTRO (call after lamp touch) ////////////////////
export async function genieIntro({ user={} } = {}){
  const name = user.firstName || user.name || 'Friend';
  const wantEmoji = CONFIG.allowEmoji;
  const b1 = trimSentences(withOneEmoji(CONFIG.intro.line1, wantEmoji), 2);
  const b2 = trimSentences(withOneEmoji(CONFIG.intro.line2, wantEmoji), 2);
  const b3 = sprinklePhrase(trimSentences(withOneEmoji(CONFIG.intro.line3, wantEmoji), 2));
  const bubbles = [b1, b2, b3];
  return {
    theme: 'self',
    mood: 'warm',
    bubbles,
    chunks: bubbles.slice(),
    text: bubbles.join('\n\n'),
    segments: { opening: b1, prompt: b3, closer: '' }
  };
}

//////////////////// GENIE RITUAL FRAMEWORK (Reflection → Exercise → Action) ////////////////////
const YOUTUBE = /(\byt\b|youtube|subs|subscribers|channel|creator|video)/i;

function buildMysticReflection(name, input, theme){
  const metaBank = METAPHORS[theme] || METAPHORS.self;
  const meta = rand(metaBank);
  const wish = (input||'').trim();
  return `As you wish, ${title(name)} — your words are etched in the sand of time: “${wish}”. Picture it like this: ${meta}`;
}

function buildVisualization(theme, input){
  // Lightweight ritualized mental exercise
  if (YOUTUBE.test(input||'')){
    return [
      "✨ Ritual (60 seconds):",
      "Close your eyes. Breathe out slowly.",
      "See your channel like a golden portal; each subscriber a spark choosing your light.",
      "Whisper: “I broadcast value; the ones who need it find me.”"
    ].join("\n");
  }
  if (theme==='money'){
    return [
      "✨ Ritual (60 seconds):",
      "Hand on heart; exhale longer than you inhale.",
      "Imagine money as a clear river; watch one small gate open and water rush in.",
      "Whisper: “I’m ready to receive and circulate.”"
    ].join("\n");
  }
  if (theme==='love'){
    return [
      "✨ Ritual (60 seconds):",
      "Relax your jaw and shoulders.",
      "Picture a porch light glowing steady; the right people walk toward warmth.",
      "Whisper: “I choose what chooses me.”"
    ].join("\n");
  }
  if (theme==='health'){
    return [
      "✨ Ritual (60 seconds):",
      "Inhale 4, exhale 6 — seven times.",
      "See your nervous system as a dimmer switch lowering to calm.",
      "Whisper: “My body is safe right now.”"
    ].join("\n");
  }
  return [
    "✨ Ritual (60 seconds):",
    "Breathe out. Let your shoulders fall.",
    "See the path already walked by future-you; step into those footprints.",
    "Whisper: “It’s already mine — I act like it.”"
  ].join("\n");
}

function buildActionNudge(theme, input){
  if (YOUTUBE.test(input||'')){
    return [
      "💫 First move:",
      "Record one 30s take with a sharp hook in the first 2 seconds.",
      "Post it today. Then reply to 3 comments with a question.",
      "Write 3 title options — choose the one you’d click blind."
    ].join("\n");
  }
  const steps = pickSteps(theme);
  return ["💫 First move:", steps[0], steps[1], steps[2]].join("\n");
}

function buildPerspectiveFlip(theme){
  const q = rand(probe[theme] || probe.self);
  return `🧠 Shift: ${q}`;
}

function buildCloser(){
  return rand([
    "It is sealed. One honest move opens the gate.",
    "The lamp stays warm when you move. Small moves, great spells.",
    "We don’t chase; we glow. Go light the next inch."
  ]);
}

//////////////////// GENIE REPLY (multi-bubble) ////////////////////
export async function genieReply({ input='', user={}, opts={} }){
  const name = user.firstName || user.name || 'Friend';
  const wantEmoji = opts.emoji !== false && CONFIG.allowEmoji;
  const pref = (typeof window!=='undefined' && localStorage.getItem('mg_pain_focus')) || 'self';
  const themePref = (pref==='Money stress' ? 'money' : pref==='Relationship loop' ? 'love' : pref==='Health / grief' ? 'health' : pref);
  const theme = detectTheme(input, themePref);

  // witty cue (taunt/challenge/praise)
  const cue = CONFIG.wittyComebacks ? detectWitCue(input) : null;

  // Optional numerology + angel hints
  const numerix = CONFIG.includeNumerology ? numerologyDownload(name) : null;
  const angel = CONFIG.includeAngelHint ? angelHint() : null;

  // If off-course, steer back with cheeky opener + role reminder
  if (isOffCourse(input)) {
    const lead = cue && comebacks[cue] ? rand(comebacks[cue]) : "Let’s keep the lamp pointed at your wish.";
    const nudge = "Give me one clean sentence for your wish (present tense). Example: “I land one new paying client this week.”";
    const micro = "Then I’ll drop 3 tiny moves you can do today. Ready?";

    const bubbles = [
      trimSentences(withOneEmoji(lead, wantEmoji), 2),
      trimSentences(withOneEmoji(nudge, wantEmoji), 3),
      trimSentences(withOneEmoji(micro, wantEmoji), 2)
    ].slice(0, clamp(CONFIG.maxBubbles, 3, 4));

    return packReturn({ name, theme, mood: 'directive', bubbles, numerix, angel: angel || '' });
  }

  // Normal ritualized 3-part response (with optional witty lead-in)
  const reflection = buildMysticReflection(name, input, theme);
  const viz = buildVisualization(theme, input);
  const action = buildActionNudge(theme, input);
  const flip = buildPerspectiveFlip(theme);
  const seal = buildCloser();

  let bubbles = [];

  if (cue && comebacks[cue]) {
    bubbles.push(rand(comebacks[cue]));
  }

  bubbles.push(reflection, viz, action, flip);

  if (numerix) bubbles.push(`Name note for ${title(name)} — ${numerix.text}`);
  if (angel) bubbles.push(angel);
  bubbles.push(seal);

  bubbles = bubbles
    .filter(Boolean)
    .map(s => trimSentences(withOneEmoji(s, wantEmoji), 3));
  bubbles = bubbles.slice(0, clamp(CONFIG.maxBubbles, 4, 6));

  return packReturn({ name, theme, mood:'warm', bubbles, numerix, angel: angel || '' });
}

//////////////////// PACK RETURN ////////////////////
function packReturn({ name, theme='self', mood='neutral', bubbles=[], numerix=null, angel='' }){
  const chunks = bubbles.slice();
  const text = bubbles.join('\n\n');
  return {
    theme, mood, bubbles, chunks, text,
    segments: {
      opening: bubbles[0] || '',
      metaphor: bubbles.find(b=>b.startsWith('Picture it like this:')) || '',
      assignment: bubbles.find(b=>b.startsWith('Try this:')) || '',
      question: bubbles.find(b=>b.endsWith('?')) || '',
      numerology: numerix?.text || '',
      angel: angel || '',
      closer: bubbles.at(-1) || ''
    }
  };
}
