// pages/chat.js — Manifestation Genie
// Flow: welcome → vibe → resumeNew → questionnaire → checklist → chat
// Supabase name integration + localStorage persistence (per session)

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'

/* =========================
   Signature Language Kit
   ========================= */
const GenieLang = {
  greetings: [
    "The lamp glows… your Genie is here. ✨ What’s stirring in your heart today, {firstName}?",
    "Rub the lamp 🔮 — let’s spark some magic, {firstName}.",
    "The stars whispered your name, {firstName}… shall we begin?",
    "The portal is open 🌌 — step inside, {firstName}."
  ],
  vibePrompt: "Pick your vibe: 🔥 Bold, 🙏 Calm, 💰 Rich. What are you feeling today?",
  resumeOrNew: "Continue the last wish, or spark a fresh one?",
  resumeLabel: "Continue last wish",
  newLabel: "Start a new wish",
  questPrompts: {
    wish: "What’s the goal you want to manifest? Say it like you mean it.",
    block: "What’s blocking you? Drop the excuse in one line.",
    micro: "What’s 1 micro-move you can make today? Something small."
  },
  rewards: [
    "YES! That’s the one. Door unlocked.",
    "Love it. The signal’s clear — time to move.",
    "Locked in. You're ready. Execute time.",
    "Noted. The window’s open. Step through."
  ],
  closing: "The lamp dims… but the magic stays with you.",
  tinyCTA: "New wish or keep walking the path we opened?"
}

/* =========================
   Helpers
   ========================= */
const todayStr = () => new Date().toISOString().slice(0,10)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const STORAGE_KEY = 'mg_chat_state_v1'
const NAME_KEY = 'mg_first_name'
const newId = () => Math.random().toString(36).slice(2,10)

const injectName = (s, name) => (s || '').replaceAll('{firstName}', name || 'Friend')

const loadState = () => {
  if (typeof window === 'undefined') return null
  try {
    const r = localStorage.getItem(STORAGE_KEY)
    return r ? JSON.parse(r) : null
  } catch { return null }
}

const saveState = (state) => {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
}

const getFirstNameFromCache = () => {
  if (typeof window === 'undefined') return 'Friend'
  try {
    const saved = localStorage.getItem(NAME_KEY)
    if (saved && saved.trim()) return saved.trim().split(' ')[0]
  } catch {}
  return 'Friend'
}

// Streak announce persistence (once per day)
const STREAK_ANNOUNCED_KEY = 'mg_streak_announced_date'
function getAnnouncedDate() {
  try { return localStorage.getItem(STREAK_ANNOUNCED_KEY) || null } catch { return null }
}
function setAnnouncedToday() {
  try { localStorage.setItem(STREAK_ANNOUNCED_KEY, getToday()) } catch {}
}

const toSocialLines = (text='', wordsPerLine=9) => {
  const soft = text
    .replace(/\r/g,'')
    .replace(/([.!?])\s+/g, '$1\n')
    .replace(/\s+[-–—]\s+/g, '\n');

  const lines = [];
  for (const piece of soft.split(/\n+/)) {
    const words = piece.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    for (let i = 0; i < words.length; i += wordsPerLine) {
      lines.push(words.slice(i, i + wordsPerLine).join(' '));
    }
  }
  return lines.join('\n');
};
const nl2br = (s='') => s.replace(/\n/g, '<br/>');

// --- Pretty + cosmic formatting for Genie replies ---
const cosmicOutros = [
  "The stars tilt toward {topic}. ✨",
  "Orbit set; trajectory locked. 🔮",
  "The lamp hums in your direction. 🌙",
  "Gravity favors your move. 🌌",
  "Signals aligned; door unlocked. 🗝️"
];
/* ===== Cosmic explanation + humor layer ===== */
const COSMIC_METAPHORS = [
  ['visualize','Like plotting stars before a voyage—see it, then sail.'],
  ['assess','Numbers are telescope lenses—clean them and the path sharpens.'],
  ['schedule','Calendars are gravity; what you schedule, orbits you.'],
  ['contact','Knock and the door vibrates; knock twice and it opens.'],
  ['record','One take beats zero takes—silence never went viral.'],
  ['post','Ship the signal so your tribe can find its frequency.'],
  ['email','A good subject line is a comet tail—impossible to ignore.'],
  ['apply','Forms are portals; boring but they warp reality when complete.'],
  ['practice','Reps are runways—every pass smooths the landing.'],
  ['learn','Knowledge is dark matter—unseen, but it holds your galaxy.']
];

function explainLine(line='') {
  const L = line.trim();
  if (!L) return '';
  // Skip if it looks like an outro or already explanatory
  if (/(The lamp|orbit|stars|gravity|cosmos|Signals aligned)/i.test(L)) return L;

  // Try to match a verb and attach a short metaphor
  let add = null;
  for (const [key, meta] of COSMIC_METAPHORS) {
    if (new RegExp(`\\b${key}`, 'i').test(L)) { add = meta; break; }
  }
  if (!add) add = 'Do it small and soon—momentum makes its own magic.';

  // If line starts with an emoji bullet we keep it; else add one
  const hasEmoji = /^[^\w\s]/.test(L);
  const base = hasEmoji ? L : `✨ ${L}`;
  return `${base}\n<span style="opacity:.8">— ${add}</span>`;
}

function wittyCloser(topic='this') {
  const zingers = [
    `I’ll hold the lamp; you push the door on “${topic}.”`,
    `Pro tip: perfection is a black hole—aim for orbit.`,
    `If the muse calls, let it go to voicemail—ship first.`,
    `Cosmos math: tiny action × today > giant plan × someday.`,
  ];
  return zingers[Math.floor(Math.random()*zingers.length)];
}

function ensureNoNumberedLists(s='') {
  return s
    .replace(/^\s*\d+\.\s*/gm, '• ')
    .replace(/^\s*-\s*/gm, '• ');
}

function bulletize(s='') {
  return s.split(/\n+/).map(line => {
    const L = line.trim();
    if (!L) return '';
    if (/^(•|\*|–|-)/.test(L)) return L.replace(/^(•|\*|–|-)\s*/, '');
    if (/^(step|do|try|next|then|now|contact|create|assess|visualize|message|record|post|ship|book|schedule|prepare|explore)\b/i.test(L)) {
      const anchors = ["🌌","🔑","💰","🌀","✨"];
      return `${anchors[Math.floor(Math.random()*anchors.length)]} ${L}`;
    }
    return L;
  }).join('\n');
}

function addCosmicOutro(s='', topic='this') {
  const line = cosmicOutros[Math.floor(Math.random()*cosmicOutros.length)].replace('{topic}', topic);
  if (/(star|orbit|cosmos|universe|galaxy|gravity|lamp|portal)/i.test(s.split('\n').slice(-2).join(' '))) return s;
  return `${s}\n\n${line}`;
}

function formatGenieReply(raw='', topic='this') {
  const noNums = ensureNoNumberedLists(raw);
  const bullets = bulletize(noNums);
  const tight = toSocialLines(bullets, 9);
  const withOutro = addCosmicOutro(tight, topic);
  return withOutro.trim();
}


/* =========================
   Streak Messages (Brunson-style, human + hype)
   ========================= */
function streakMessage(count) {
  if (count === 1) return "Day 1 — you showed up. Momentum just started.";
  if (count === 2) return "2 days in a row. That’s a pattern forming. Keep it alive.";
  if (count === 3) return "3-day streak. You’re building a muscle. Don’t break it tonight.";
  if (count >= 4 && count < 7) return `${count} days straight — proof this isn’t luck. Keep stacking wins.`;
  if (count >= 7 && count < 30) return `${count} days. Weekly habit formed — imagine what 30 does.`;
  return `${count} days strong — this isn’t a streak anymore, it’s who you are.`;
}

/* =========================
   Brunson Daily Streak (localStorage)
   ========================= */
const STREAK_KEY = 'mg_streak'
const LAST_DATE_KEY = 'mg_last_date'

function getToday() { return new Date().toISOString().slice(0,10) }
function getYesterday() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0,10)
}
function loadStreak() {
  if (typeof window === 'undefined') return { count: 0, last: null }
  try {
    const count = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10)
    const last = localStorage.getItem(LAST_DATE_KEY)
    return { count: isNaN(count) ? 0 : count, last }
  } catch { return { count: 0, last: null } }
}
function saveStreak(count, last) {
  try {
    localStorage.setItem(STREAK_KEY, String(count))
    localStorage.setItem(LAST_DATE_KEY, last)
  } catch {}
}

/* =========================
   Minimal Questionnaire
   ========================= */
function Questionnaire({ initial, onComplete, vibe, firstName }) {
  const [wish, setWish]   = useState(initial?.wish || "")
  const [block, setBlock] = useState(initial?.block || "")
  const [micro, setMicro] = useState(initial?.micro || "")

  const canSubmit = wish.trim() && micro.trim()

  return (
    <>
      <div style={styles.portalHeader}>
        <h1 style={styles.portalTitle}>Your Personal AI Genie ✨</h1>
        <p style={styles.portalSubtitle}>This is your daily portal to manifest your dreams into reality.</p>
      </div>

      <div style={styles.card}>
        <h3 style={styles.h3}>Let's decode your dream, {firstName}👇</h3>

        <p style={styles.subtle}>{GenieLang.questPrompts.wish}</p>
        <textarea
          value={wish}
          onChange={e=>setWish(e.target.value)}
          placeholder="One line. No fluff."
          style={styles.textarea}
          rows={3}
        />

        <p style={{...styles.subtle, marginTop:16}}>{GenieLang.questPrompts.block}</p>
        <textarea
          value={block}
          onChange={e=>setBlock(e.target.value)}
          placeholder="Say the snag. Simple + true."
          style={styles.textarea}
          rows={2}
        />

        <p style={{...styles.subtle, marginTop:16}}>{GenieLang.questPrompts.micro}</p>
        <input
          value={micro}
          onChange={e=>setMicro(e.target.value)}
          placeholder="Send it. Start it. Ship it."
          style={styles.input}
        />

        <button
          style={{...styles.btn, marginTop:16, opacity: canSubmit ? 1 : 0.6, cursor: canSubmit ? 'pointer' : 'not-allowed'}}
          disabled={!canSubmit}
          onClick={() => onComplete({wish:wish.trim(), block:block.trim(), micro:micro.trim(), vibe, date: todayStr()})}
        >
          Lock it in →
        </button>
        <p style={{...styles.mini, marginTop:12}}>{pick(GenieLang.rewards)}</p>
      </div>
    </>
  )
}

/* =========================
   Cosmic Checklist (human + metaphor)
   ========================= */
function Checklist({ wish, micro, steps, onToggle, onComplete, onSkip }) {
  const allDone = steps.length > 0 && steps.every(s => s.done)

  return (
    <div style={styles.cosmicCard}>
      <div style={styles.scrollHeader}>
        <div style={styles.scrollBadge}>🌌 Cosmic Scroll</div>
        <h3 style={styles.scrollTitle}>
          Do this now for: “{wish || 'your wish'}”
        </h3>
        <p style={styles.scrollSub}>
          Three precise moves, each with a reason. Small + soon beats big + later.
        </p>
      </div>

      <ul style={styles.checklist}>
        {steps.map((s, i) => (
          <li key={s.id} style={styles.checkItem}>
            <label style={styles.checkLabel}>
              <input
                type="checkbox"
                checked={!!s.done}
                onChange={() => onToggle(s.id)}
                style={styles.checkbox}
              />
              <div>
                <div style={styles.stepTitle}>{i+1}. {s.text}</div>
                {s.why && <div style={styles.stepWhy}>{s.why}</div>}
              </div>
            </label>
          </li>
        ))}
      </ul>

      <div style={styles.row}>
        <button
          style={{...styles.btn, opacity: allDone ? 1 : .65, cursor: allDone ? 'pointer' : 'not-allowed'}}
          disabled={!allDone}
          onClick={onComplete}
        >
          All done → Enter chat
        </button>
        <button style={styles.btnGhost} onClick={onSkip}>Skip for now</button>
      </div>

      {micro ? (
        <p style={{...styles.mini, marginTop:10}}>
          Your micro-move: <b>{micro}</b> — mark it complete once it’s in motion.
        </p>
      ) : null}
    </div>
  )
}



/* =========================
   Messenger-style Chat Console (labels + likes)
   ========================= */
function ChatConsole({ thread, onSend, onReset, onToggleLike, firstName }) {
  const [input, setInput] = useState("")
  const endRef = useRef(null)
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) }, [thread])

  return (
    <div style={styles.chatWrap}>
      <div style={styles.chatStream}>
        {thread.map((m) => {
          const isAI = m.role === 'assistant'
          return (
            <div key={m.id} style={isAI ? styles.rowAI : styles.rowUser}>
              {/* Avatar */}
              <div style={styles.avatar}>{isAI ? '🔮' : '🙂'}</div>

              <div style={{flex:1, minWidth:0}}>
                {/* Name label (mirror) */}
                <div style={isAI ? styles.nameLabelAI : styles.nameLabelUser}>
                  {isAI ? 'Genie' : (m.author || firstName || 'You')}
                </div>

                {/* Bubble */}
                <div style={isAI ? styles.bubbleAI : styles.bubbleUser}>
                  <div style={styles.bubbleText} dangerouslySetInnerHTML={{__html: m.content}} />
                </div>

                {/* Reactions row */}
                <div style={styles.reactRow}>
                  {isAI ? (
                    <button
                      style={m.likedByUser ? styles.likeBtnActive : styles.likeBtn}
                      onClick={() => onToggleLike(m.id, 'user')}
                      aria-label="Like Genie message"
                    >
                      👍 {m.likedByUser ? 'Liked' : 'Like'}
                    </button>
                  ) : (
                    m.likedByGenie ? <span style={styles.likeBadge}>Genie liked this 👍</span> : null
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div style={styles.chatInputRow}>
        <input
          value={input}
          onChange={(e)=>setInput(e.target.value)}
          placeholder="Speak to your Genie… 🔮"
          onKeyDown={(e)=>{ if(e.key==='Enter' && input.trim()){ onSend(input.trim()); setInput('') } }}
          style={styles.chatInput}
        />
        <button style={styles.btn} onClick={()=>{ if(input.trim()){ onSend(input.trim()); setInput('') } }}>
          Send
        </button>
        <button style={styles.btnGhost} onClick={onReset}>New wish</button>
      </div>
    </div>
  )
}

/* =========================
   Main Page
   ========================= */
function toPlainMessages(thread) {
  const strip = (s='') => s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return thread.map(m => ({
    role: m.role,
    content: strip(m.content || '')
  }))
}

export default function ChatPage() {
  // FIRST NAME: cache first; hydrate from Supabase (profiles → metadata → email)
  const [firstName, setFirstName] = useState(getFirstNameFromCache())

  // phases
  const [phase, setPhase] = useState('welcome')
  const [vibe, setVibe] = useState(null) // 'BOLD' | 'CALM' | 'RICH'
  const [currentWish, setCurrentWish] = useState(null) // {wish, block, micro, vibe, date}
  const [lastWish, setLastWish] = useState(null)
  const [steps, setSteps] = useState([])

  // streak state
  const [streak, setStreak] = useState(0)
  const [hasAnnouncedStreak, setHasAnnouncedStreak] = useState(false)

  // greeting seeded with name
  const [greeting] = useState(() => injectName(pick(GenieLang.greetings), firstName))
  const [thread, setThread] = useState([
    { id:newId(), role:'assistant', author:'Genie', content:greeting, likedByUser:false, likedByGenie:false }
  ])

  // Supabase name hydration
useEffect(() => {
  let alive = true
  ;(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!alive || !user) return
      let fn = null

      try {
        const { data: p } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle()
        if (p?.full_name) fn = String(p.full_name).trim().split(' ')[0]
      } catch {}

      if (!fn) {
        const meta = user.user_metadata || {}
        fn =
          (meta.full_name?.trim().split(' ')[0]) ||
          (meta.name?.trim().split(' ')[0]) ||
          meta.given_name ||
          null
      }

      if (!fn) fn = (user.email || '').split('@')[0] || 'Friend'

      if (alive) {
        setFirstName(fn)
        try { localStorage.setItem(NAME_KEY, fn) } catch {}

        // 👉 NEW: on login, if no vibe selected yet, show the Vibe screen first
        setPhase(prev => (prev !== 'chat' && prev !== 'checklist' && prev !== 'questionnaire' && !vibe) ? 'vibe' : prev)
      }
    } catch {}
  })()
  return () => { alive = false }
  // include `vibe` so the setter sees the latest value
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [vibe])


  // Load persisted state on mount
  useEffect(()=>{
    const s = loadState()
    if (s) {
      setPhase(s.phase || 'welcome')
      setVibe(s.vibe || null)
      setCurrentWish(s.currentWish || null)
      setLastWish(s.lastWish || null)
      setSteps(s.steps || [])
      setThread(s.thread?.length ? s.thread : [{role:'assistant', content: injectName(pick(GenieLang.greetings), firstName)}])
    }

    // hydrate streak
    const { count, last } = loadStreak()
    const today = getToday()
    if (last === today) {
      setStreak(count)
    } else if (last === getYesterday()) {
      setStreak(count + 1)
      saveStreak(count + 1, today)
    } else {
      setStreak(1)
      saveStreak(1, today)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist state
  useEffect(()=>{ saveState({ phase, vibe, currentWish, lastWish, steps, thread }) }, [phase, vibe, currentWish, lastWish, steps, thread])

  // Scroll to top on phase change
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [phase])

  // Announce streak once when entering chat (human, once per day)
  useEffect(() => {
    if (phase !== 'chat') return

    const today = getToday()
    const alreadyAnnouncedToday = getAnnouncedDate() === today

    if (alreadyAnnouncedToday) {
      if (!hasAnnouncedStreak) setHasAnnouncedStreak(true)
      return
    }

    if (!hasAnnouncedStreak) {
      setThread(prev => prev.concat({
        id: newId(),
        role: 'assistant',
        author: 'Genie',
        content: nl2br(escapeHTML(
          `${streakMessage(streak)}\nKeep the streak alive — what’s today’s micro-move?`
        )),
        likedByUser:false, likedByGenie:false
      }))
      setHasAnnouncedStreak(true)
      setAnnouncedToday()
    }
  }, [phase, streak, hasAnnouncedStreak])

  const handlePickVibe = (v) => {
    setVibe(v)
    setPhase('resumeNew')
    setThread(prev => prev.concat({
      role:'assistant',
      content: `${GenieLang.vibePrompt}<br/><span style="opacity:.8">Chosen: <b>${emojiFor(v)} ${titleCase(v)}</b></span>`
    }))
  }

  const handleResume = () => {
    const chosen = lastWish || currentWish
    if (chosen) {
      setCurrentWish(chosen)
      if ((steps || []).length) {
        setPhase('checklist')
      } else {
        setPhase('questionnaire')
      }
      setThread(prev => prev.concat({
        role:'assistant',
        content: `We’ll keep weaving the last wish: <b>${escapeHTML(chosen.wish)}</b>.`
      }))
    } else {
      setPhase('questionnaire')
      setThread(prev => prev.concat({ role:'assistant', content: "No past wish found. Let’s light a new one." }))
    }
  }

  const handleNew = () => {
    setCurrentWish(null)
    setSteps([])
    setPhase('questionnaire')
    setThread(prev => prev.concat({ role:'assistant', content: "New star, new path. I’m listening…" }))
  }

  // 👉 Questionnaire → Checklist (MISSING BEFORE — now included)
  const handleQuestComplete = (data) => {
    setCurrentWish(data)
    setLastWish(data)
    const generated = generateChecklist(data)
    setSteps(generated)
    setPhase('checklist')
    setThread(prev => prev.concat(
      { id:newId(), role:'assistant', author:'Genie', content: `Wish set: <b>${escapeHTML(data.wish)}</b>.` },
      { id:newId(), role:'assistant', author:'Genie', content: pick(GenieLang.rewards) },
      { id:newId(), role:'assistant', author:'Genie', content: `Do these three now, then we talk. ${firstName}, speed > perfect.` }
    ))
  }

  // Checklist interactions
  const toggleStep = (id) => {
    setSteps(prev => prev.map(s => s.id === id ? {...s, done: !s.done} : s))
  }

  const completeChecklist = () => {
    setPhase('chat')
    setThread(prev => prev.concat({
      role:'assistant',
      content: `Strong move. Checklist complete. Speak, and I’ll shape the path, ${firstName}. ${GenieLang.tinyCTA}`
    }))
  }

  const skipChecklist = () => {
    setPhase('chat')
    setThread(prev => prev.concat({
      role:'assistant',
      content: `We’ll refine live. Tell me where you’re stuck on “${escapeHTML(currentWish?.wish || 'your goal')}”.`
    }))
  }

  const onToggleLike = (id, who) => {
    setThread(prev => prev.map(m => {
      if (m.id !== id) return m
      if (who === 'user') return { ...m, likedByUser: !m.likedByUser }
      if (who === 'genie') return { ...m, likedByGenie: !m.likedByGenie }
      return m
    }))
  }

  // Streak bump on first activity of a new day
  function bumpStreakOnActivity() {
    const { count, last } = loadStreak()
    const today = getToday()
    if (last === today) return count // already counted today
    const next = (last === getYesterday()) ? count + 1 : 1
    saveStreak(next, today)
    setStreak(next)
    // mark that we've already announced today so the top-of-chat card doesn't duplicate
    try { localStorage.setItem(STREAK_ANNOUNCED_KEY, today) } catch {}

    // celebrate inside chat (human)
    setThread(prev => prev.concat({
      id: newId(),
      role: 'assistant',
      author: 'Genie',
      content: nl2br(escapeHTML(
        `New day logged. Streak: ${next}.\nDon’t break it — ship one tiny thing now.`
      )),
      likedByUser:false, likedByGenie:false
    }))
    return next
  }

  const maybeGenieLikes = (msg) => {
    const t = (msg.content || '').toLowerCase()
    const isWin = /(done|shipped|published|posted|sold|launched|emailed|uploaded|completed|locked in)/.test(t)
    const shouldLike = isWin || Math.random() < 0.25
    if (!shouldLike) return
    setThread(prev => prev.map(m => m.id === msg.id ? ({ ...m, likedByGenie:true }) : m))
  }

  const handleSend = async (text) => {
    const userMsg = {
      id: newId(),
      role: 'user',
      author: firstName || 'You',
      content: escapeHTML(text),
      likedByUser: false,
      likedByGenie: false
    }
    setThread(prev => prev.concat(userMsg))
    maybeGenieLikes(userMsg)

    // bump streak for today's first action
    bumpStreakOnActivity()

    try {
      const reply = await genieReply({ text, thread, firstName, currentWish, vibe })
      const topic = (currentWish?.wish || text || 'this').toLowerCase().slice(0, 80);
      const pretty = formatGenieReply(reply, topic);
      const aiMsg = {
        id: newId(),
        role: 'assistant',
        author: 'Genie',
        content: nl2br(escapeHTML(pretty)),
        likedByUser: false,
        likedByGenie: false
      }
      setThread(prev => prev.concat(aiMsg))
    } catch {
      const errMsg = {
        id: newId(),
        role: 'assistant',
        author: 'Genie',
        content: escapeHTML("The lamp flickered. Try again."),
        likedByUser: false,
        likedByGenie: false
      }
      setThread(prev => prev.concat(errMsg))
    }
  }

  const resetToNewWish = () => {
    setPhase('vibe')
    setVibe(null)
    setCurrentWish(null)
    setSteps([])
    setThread([{
      id:newId(),
      role:'assistant',
      author:'Genie',
      content: injectName(pick(GenieLang.greetings), firstName),
      likedByUser:false,
      likedByGenie:false
    }])
    setHasAnnouncedStreak(false)

    // force scroll back up
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.container}>
        {/* Welcome */}
        {phase === 'welcome' && (
          <div style={styles.card}>
            <h1 style={{fontSize:34, fontWeight:900, margin:0}}>Meet Your Genie 🔮</h1>
            <p style={{fontSize:18, opacity:.92, marginTop:8}}>
              The lamp is open. Set your vibe and let’s flip what’s blocking you.
            </p>
            <p style={styles.lead}>{injectName(pick(GenieLang.greetings), firstName)}</p>
            <button style={styles.btn} onClick={()=>setPhase('vibe')}>Start →</button>
          </div>
        )}

        {/* Vibe */}
        {phase === 'vibe' && (
          <div style={styles.card}>
            <p style={styles.lead}>{GenieLang.vibePrompt}</p>
            <div style={styles.vibeRow}>
              <VibeButton label="BOLD" emoji="🔥" onClick={()=>handlePickVibe('BOLD')} />
              <VibeButton label="CALM" emoji="🙏" onClick={()=>handlePickVibe('CALM')} />
              <VibeButton label="RICH" emoji="💰" onClick={()=>handlePickVibe('RICH')} />
            </div>
          </div>
        )}

        {/* Resume or New */}
        {phase === 'resumeNew' && (
          <div style={styles.card}>
            <p style={styles.lead}>{GenieLang.resumeOrNew}</p>
            <div style={styles.row}>
              <button style={styles.btn} onClick={handleResume}>{GenieLang.resumeLabel}</button>
              <button style={styles.btnGhost} onClick={handleNew}>{GenieLang.newLabel}</button>
            </div>
            {lastWish && (
              <div style={styles.lastWish}>
                <div style={styles.mini}><b>Last wish:</b> {lastWish.wish}</div>
                <div style={styles.mini}><b>Vibe:</b> {emojiFor(lastWish.vibe)} {titleCase(lastWish.vibe || '')}</div>
                <div style={styles.mini}><b>Last step:</b> {lastWish.micro}</div>
              </div>
            )}
          </div>
        )}

        {/* Questionnaire */}
        {phase === 'questionnaire' && (
          <Questionnaire
            initial={currentWish}
            onComplete={handleQuestComplete}
            vibe={vibe}
            firstName={firstName}
          />
        )}

        {/* Checklist */}
        {phase === 'checklist' && (
          <Checklist
            wish={currentWish?.wish}
            micro={currentWish?.micro}
            steps={steps}
            onToggle={toggleStep}
            onComplete={completeChecklist}
            onSkip={skipChecklist}
          />
        )}

        {/* Chat */}
        {phase === 'chat' && (
          <ChatConsole
            thread={thread}
            onSend={handleSend}
            onReset={resetToNewWish}
            onToggleLike={onToggleLike}
            firstName={firstName}
          />
        )}
      </div>
    </div>
  )
}

/* =========================
   Small UI bits
   ========================= */
function VibeButton({ label, emoji, onClick }) {
  return (
    <button onClick={onClick} style={styles.vibeBtn}>
      <div style={{fontSize:28, lineHeight:1, marginBottom:6}}>{emoji}</div>
      <div style={{fontWeight:800}}>{label}</div>
    </button>
  )
}

/* Hit /api/chat (your one-liner operator Genie) */
async function genieReply({ text, thread, firstName, currentWish, vibe, intent }) {
  const context = {
    intent: intent || null,
    mood: null,
    wish: currentWish?.wish || null,
    block: currentWish?.block || null,
    micro: currentWish?.micro || null,
    vibe: vibe || null,
  }

  const resp = await fetch('/api/chat', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({
      userName: firstName || null,
      hmUrl: 'https://hypnoticmeditations.ai',
      context,
      messages: [
        ...toPlainMessages(thread),
        { role:'user', content:text }
      ]
    })
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data?.error || 'API error')
  return data.reply || 'OK.'
}

/* =========================
   Styles
   ========================= */
const styles = {
  portalHeader: { textAlign:'left', marginBottom:18 },
  portalTitle: { fontSize:34, fontWeight:900, margin:0, color:'#ffd600', letterSpacing:.3 },
  portalSubtitle: { fontSize:18, opacity:.92, marginTop:6 },

  wrap: {
    minHeight:'100vh',
    color:'#f2f2f6',
    padding:'24px',
    background:'radial-gradient(1200px 600px at 50% -10%, #1a1b2d 0%, #0c0d14 55%, #090a10 100%)',
  },
  container: { maxWidth: 860, margin:'0 auto' },

  card: {
    background:'#171826',
    border:'1px solid rgba(255,255,255,0.06)',
    borderRadius:18,
    padding:24,
    boxShadow:'0 18px 40px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,0.02)'
  },

  h2: { margin:0, fontSize:28, fontWeight:900, letterSpacing:.3 },
  h3: { marginTop:0, fontSize:22, fontWeight:850 },
  lead: { fontSize:18, opacity:.96, lineHeight:1.45 },
  subtle: { fontSize:15, opacity:.86, lineHeight:1.45 },
  mini: { fontSize:13, opacity:.82 },

  row: { display:'flex', gap:12, marginTop:12, flexWrap:'wrap' },
  vibeRow: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginTop:12 },

  vibeBtn: {
    padding:'14px 16px',
    borderRadius:14,
    border:'1px solid rgba(255,255,255,0.08)',
    background:'linear-gradient(180deg, #161726 0%, #0f111a 100%)',
    color:'#fff',
    cursor:'pointer',
    textAlign:'center',
    boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.02), 0 6px 16px rgba(0,0,0,.45)'
  },

  // Messenger rows
  rowAI:   { display:'flex', gap:10, alignItems:'flex-start', margin:'10px 0' },
  rowUser: { display:'flex', gap:10, alignItems:'flex-start', margin:'10px 0', flexDirection:'row-reverse' },
  avatar:  { width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 },
  nameLabelAI: { fontSize:12, opacity:.7, margin:'0 0 4px 4px', textAlign:'left' },
  nameLabelUser: { fontSize:12, opacity:.7, margin:'0 4px 4px 0', textAlign:'right' },

  reactRow: { display:'flex', gap:8, alignItems:'center', margin:'6px 6px 0 6px' },
  likeBtn: {
    border:'1px solid rgba(255,255,255,0.14)',
    background:'transparent',
    color:'#e6e6ee',
    borderRadius:999,
    padding:'2px 8px',
    fontSize:12,
    cursor:'pointer'
  },
  likeBtnActive: {
    border:'1px solid rgba(255,214,0,0.6)',
    background:'rgba(255,214,0,0.12)',
    color:'#ffd600',
    borderRadius:999,
    padding:'2px 8px',
    fontSize:12,
    cursor:'pointer'
  },
  likeBadge: {
    fontSize:12,
    color:'#ffd600',
    background:'rgba(255,214,0,0.10)',
    border:'1px solid rgba(255,214,0,0.35)',
    borderRadius:999,
    padding:'2px 8px'
  },

  bubbleAI: {
    maxWidth:'85%',
    background:'rgba(255,255,255,0.04)',
    padding:'12px 14px',
    borderRadius:12,
    border:'1px solid rgba(255,255,255,0.08)',
    margin:'8px 0',
    backdropFilter:'blur(2px)',
    fontWeight:600,
    letterSpacing:.1,
    lineHeight:1.7
  },
  bubbleUser: {
    maxWidth:'85%',
    background:'rgba(255,214,0,0.08)',
    padding:'12px 14px',
    borderRadius:12,
    border:'1px solid rgba(255,214,0,0.18)',
    margin:'8px 0 8px auto'
  },
  bubbleText: {
    fontSize:15,
    lineHeight:1.6,
    whiteSpace:'normal',
    wordBreak:'break-word',
    overflowWrap:'anywhere',
  },

  btn: {
    padding:'12px 16px',
    borderRadius:14,
    border:0,
    background:'#ffd600',
    color:'#111',
    fontWeight:900,
    cursor:'pointer',
    letterSpacing:.2,
    boxShadow:'0 0 24px rgba(255,214,0,0.55), 0 8px 28px rgba(0,0,0,.35)'
  },
  btnGhost: {
    padding:'12px 16px',
    borderRadius:14,
    border:'1px solid rgba(255,255,255,0.14)',
    background:'transparent',
    color:'#e6e6ee',
    fontWeight:820,
    cursor:'pointer'
  },

  input: {
    width:'100%',
    padding:'12px 14px',
    borderRadius:12,
    border:'1px solid rgba(255,255,255,0.12)',
    background:'linear-gradient(180deg, #0f1119 0%, #0c0d14 100%)',
    color:'#fff',
    outline:'none',
    boxShadow:'0 0 14px rgba(255,214,0,0.07)'
  },
  textarea: {
    width:'100%',
    padding:'12px 14px',
    borderRadius:12,
    border:'1px solid rgba(255,255,255,0.12)',
    background:'linear-gradient(180deg, #0f1119 0%, #0c0d14 100%)',
    color:'#fff',
    outline:'none',
    resize:'vertical',
    boxShadow:'0 0 14px rgba(255,214,0,0.07)'
  },

  lastWish: {
    marginTop:12,
    padding:12,
    border:'1px dashed rgba(255,255,255,0.18)',
    borderRadius:12,
    background:'linear-gradient(180deg, rgba(255,214,0,0.05), rgba(255,214,0,0.02))'
  },

  checklist: { listStyle:'none', paddingLeft:0, margin:'8px 0 12px' },
  checkItem: { padding:'10px 12px', borderRadius:12, background:'rgba(255,255,255,0.03)', marginBottom:8, border:'1px solid rgba(255,255,255,0.06)' },
  checkLabel: { display:'flex', gap:10, alignItems:'center', cursor:'pointer' },
  checkbox: { width:18, height:18, accentColor:'#ffd600' },

  chatWrap: { display:'flex', flexDirection:'column', gap:12 },
  chatStream: {
    background:'linear-gradient(180deg, #101221 0%, #0b0c15 100%)',
    border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:18,
    padding:16,
    minHeight:380,
    maxHeight:540,
    overflowY:'auto',
    boxShadow:'0 14px 34px rgba(0,0,0,.45)'
  },
  chatInputRow: { display:'flex', gap:10, alignItems:'center' },
  chatInput: {
    flex:1,
    padding:'12px 14px',
    borderRadius:12,
    border:'1px solid rgba(255,255,255,0.12)',
    background:'linear-gradient(180deg, #0f1119 0%, #0c0d14 100%)',
    color:'#fff',
    outline:'none',
  },

  /* === Cosmic checklist theming (NEW) === */
  cosmicCard: {
    background:'linear-gradient(180deg, #18192a 0%, #11131f 100%)',
    border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:18,
    padding:24,
    boxShadow:'0 18px 40px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,0.03)'
  },
  scrollHeader: { marginBottom:12 },
  scrollBadge: {
    display:'inline-block',
    padding:'4px 10px',
    borderRadius:999,
    fontSize:12,
    letterSpacing:.2,
    background:'rgba(255,214,0,0.12)',
    color:'#ffd600',
    border:'1px solid rgba(255,214,0,0.35)',
    marginBottom:8
  },
  scrollTitle: { margin:'2px 0 4px', fontSize:22, fontWeight:850 },
  scrollSub: { fontSize:13, opacity:.8, margin:0 },

  stepTitle: { fontSize:15, fontWeight:700, lineHeight:1.5 },
  stepWhy:   { fontSize:13, opacity:.85, marginTop:4, lineHeight:1.45 },
};


/* =========================
   Tiny utils
   ========================= */
function emojiFor(v) {
  if (v === 'BOLD') return '🔥'
  if (v === 'CALM') return '🙏'
  if (v === 'RICH') return '💰'
  return '✨'
}
function titleCase(s){ return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : '' }
function escapeHTML(s=''){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) }

/* =========================
   Checklist generation — intent-aware, human, metaphors
   ========================= */
function generateChecklist({ wish='', block='', micro='' }) {
  const W = (wish || '').trim()
  const B = (block || '').trim()
  const M = (micro || '').trim()

  return [
    {
      id:'s1',
      text: B ? `Neutralize the block: ${B}` : `Clear one friction before starting`,
      why: "Blocks are like static on a radio. Remove them and the signal of action comes through."
    },
    {
      id:'s2',
      text: M ? `Do your micro-move: ${M}` : `Pick the tiniest action toward ${W}`,
      why: "Small steps bend gravity. Momentum is more important than size."
    },
    {
      id:'s3',
      text: `Publish proof of progress for “${W}”`,
      why: "The universe echoes signals. When you show movement publicly, doors swing wider."
    }
  ]
}



function capitalizeFirst(s){ if(!s) return s; return s[0].toUpperCase()+s.slice(1) }
