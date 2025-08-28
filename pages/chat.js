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
  vibePrompt: "Pick your vibe: 🔥 Bold, 🙏 Calm, 💰 Rich. What are we feeling today?",
  resumeOrNew: "Continue the last wish, or spark a fresh one?",
  resumeLabel: "Continue last wish",
  newLabel: "Start a new wish",
  questPrompts: {
    wish: "What’s the outcome you’re chasing? Say it like you mean it.",
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
        <h3 style={styles.h3}>What’s the play today, {firstName}?</h3>

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
   3-Step Checklist (custom to input)
   ========================= */
function Checklist({ wish, micro, steps, onToggle, onComplete, onSkip }) {
  const allDone = steps.length > 0 && steps.every(s => s.done)

  return (
    <div style={styles.card}>
      <h3 style={styles.h3}>
        Do this now for: <span style={{opacity:.9}}>"{wish || 'your wish'}"</span>
      </h3>

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
              <span>{i+1}. {s.text}</span>
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

{/* VIBE — MAGIC DROP-IN (paste this in place of your current {phase === 'vibe' && ( ... )} block) */}
{phase === 'vibe' && (() => {
  // tiny, self-contained styling + helpers (no external deps, no refactors)
  const v = {
    card: { position:'relative', overflow:'hidden', ...styles.card, padding:28 },
    header: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' },
    title: { ...styles.h2, letterSpacing:.2 },
    sub: { ...styles.subtle, marginTop:6 },
    recPill: {
      display:'inline-flex', alignItems:'center', gap:6,
      border:'1px solid rgba(255,214,0,.5)', background:'rgba(255,214,0,.12)',
      color:'#7A5A00', borderRadius:999, padding:'6px 10px', fontSize:12, fontWeight:800
    },
    auraBackdrop: {
      position:'absolute', inset:-80, pointerEvents:'none',
      background: 'radial-gradient(60% 60% at 70% 20%, rgba(255,214,0,.22), rgba(255,214,0,0) 60%), radial-gradient(50% 50% at 20% 80%, rgba(147, 51, 234,.18), rgba(147, 51, 234,0) 60%)',
      filter:'blur(18px)'
    },
    vibeRow: { display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:12, marginTop:16 },
    vibeBtn: (active) => ({
      position:'relative',
      padding:'16px 16px 14px',
      borderRadius:16,
      border:'1px solid rgba(17,17,17,0.10)',
      background:'#FFFFFF',
      color:'#0B0D12',
      textAlign:'left',
      cursor:'pointer',
      boxShadow: active ? '0 10px 26px rgba(255,214,0,.25), 0 6px 14px rgba(17,17,17,.08)' : '0 6px 14px rgba(17,17,17,0.06)',
      transition:'transform .08s ease, box-shadow .16s ease, border-color .16s ease',
    }),
    vibeBtnHover: { transform:'translateY(-1px)' },
    emoji: { fontSize:28, lineHeight:1, marginBottom:8 },
    labelRow: { display:'flex', alignItems:'center', justifyContent:'space-between' },
    label: { fontWeight:900, letterSpacing:.4, fontSize:14 },
    recTag: {
      display:'inline-flex', alignItems:'center', gap:6,
      border:'1px solid rgba(255,214,0,.5)', background:'rgba(255,214,0,.14)',
      color:'#7A5A00', borderRadius:999, padding:'2px 8px', fontSize:11, fontWeight:900
    },
    desc: { ...styles.mini, marginTop:8 },
    footer: { display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:16, flexWrap:'wrap', gap:10 },
    tip: { ...styles.mini },
    countdown: { ...styles.mini, border:'1px dashed rgba(255,214,0,.55)', background:'rgba(255,214,0,.10)', padding:'6px 8px', borderRadius:10, fontWeight:800 },
    miniCta: { ...styles.mini, marginTop:12, opacity:.9 }
  }

  // “FOMO” countdown (resets at local midnight)
  const now = new Date()
  const midnight = new Date(now); midnight.setHours(24,0,0,0)
  const remMs = Math.max(0, midnight - now)
  const remH = String(Math.floor(remMs/3.6e6)).padStart(2,'0')
  const remM = String(Math.floor((remMs%3.6e6)/6e4)).padStart(2,'0')

  // soft recommendation (random) — purely presentational
  const vibes = ['BOLD','CALM','RICH']
  const rec = vibes[Math.floor(Math.random()*vibes.length)]
  const recEmoji = (v) => v==='BOLD'?'🔥':(v==='CALM'?'🙏':'💰')
  const copy = {
    head: `Choose your aura for today, ${firstName || 'Friend'}.`,
    sub: "Your vibe tunes the Genie’s advice, tone and push level for the next steps.",
    desc: {
      BOLD: "Fearless action. Expect hard pushes, direct prompts and momentum.",
      CALM: "Clarity + steady focus. Softer prompts, more grounding and decompression.",
      RICH: "Money moves. Offers, pricing nudges, and revenue-forward guidance."
    }
  }

  const VibeCard = ({ label, emoji, desc, highlight }) => (
    <button
      onClick={() => handlePickVibe(label)}
      style={v.vibeBtn(highlight)}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={v.emoji}>{emoji}</div>
      <div style={v.labelRow}>
        <div style={v.label}>{label}</div>
        {highlight ? <span style={v.recTag}>Genie recommends</span> : null}
      </div>
      <div style={v.desc}>{desc}</div>
    </button>
  )

  return (
    <div style={v.card}>
      <div style={v.auraBackdrop} />

      <div style={v.header}>
        <div>
          <h2 style={v.title}>✨ The Genie awaits…</h2>
          <p style={v.sub}>{copy.sub}</p>
        </div>
        <div style={v.recPill}>
          <span>Today’s alignment:</span>
          <span>{recEmoji(rec)} <b>{rec}</b></span>
        </div>
      </div>

      <div style={v.vibeRow}>
        <VibeCard
          label="BOLD"
          emoji="🔥"
          desc={copy.desc.BOLD}
          highlight={rec === 'BOLD'}
        />
        <VibeCard
          label="CALM"
          emoji="🙏"
          desc={copy.desc.CALM}
          highlight={rec === 'CALM'}
        />
        <VibeCard
          label="RICH"
          emoji="💰"
          desc={copy.desc.RICH}
          highlight={rec === 'RICH'}
        />
      </div>

      <div style={v.footer}>
        <div style={v.tip}>You can switch vibes tomorrow if needed. Choose what serves today’s goal.</div>
        <div style={v.countdown}>Energy resets in {remH}:{remM}</div>
      </div>

      <div style={v.miniCta}>Pro tip: hover the vibes to feel their pull, then lock one in to continue →</div>
    </div>
  )
})()}


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
   Styles (inline for portability)
   ========================= */
const styles = {
  /* Header */
  portalHeader: { textAlign:'left', marginBottom:18 },
  portalTitle: { fontSize:34, fontWeight:900, margin:0, color:'#0B0D12', letterSpacing:.3 },
  portalSubtitle: { fontSize:18, color:'rgba(11,13,18,0.75)', marginTop:6 },

  /* Page wrap */
  wrap: {
    minHeight:'100vh',
    color:'#0B0D12',
    padding:'24px',
    background:'#FFFFFF'
  },
  container: { maxWidth: 860, margin:'0 auto' },

  /* Cards */
  card: {
    background:'#FFFFFF',
    border:'1px solid rgba(17,17,17,0.08)',
    borderRadius:16,
    padding:24,
    boxShadow:'0 12px 28px rgba(17,17,17,0.06)'
  },

  /* Type */
  h2: { margin:0, fontSize:28, fontWeight:900, letterSpacing:.3, color:'#0B0D12' },
  h3: { marginTop:0, fontSize:22, fontWeight:850, color:'#0B0D12' },
  lead: { fontSize:18, color:'rgba(11,13,18,0.86)', lineHeight:1.5 },
  subtle: { fontSize:15, color:'rgba(11,13,18,0.7)', lineHeight:1.5 },
  mini: { fontSize:13, color:'rgba(11,13,18,0.65)' },

  /* Layout rows */
  row: { display:'flex', gap:12, marginTop:12, flexWrap:'wrap' },
  vibeRow: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginTop:12 },

  /* Vibe buttons */
  vibeBtn: {
    padding:'14px 16px',
    borderRadius:14,
    border:'1px solid rgba(17,17,17,0.10)',
    background:'#FFFFFF',
    color:'#0B0D12',
    cursor:'pointer',
    textAlign:'center',
    boxShadow:'0 6px 14px rgba(17,17,17,0.06)',
    transition:'transform .06s ease, box-shadow .12s ease',
  },

  /* Messenger rows */
  rowAI:   { display:'flex', gap:10, alignItems:'flex-start', margin:'10px 0' },
  rowUser: { display:'flex', gap:10, alignItems:'flex-start', margin:'10px 0', flexDirection:'row-reverse' },

  avatar:  {
    width:32, height:32, borderRadius:'50%',
    background:'#F3F4F6',
    display:'flex', alignItems:'center', justifyContent:'center', fontSize:18
  },

  nameLabelAI: { fontSize: 12, color:'rgba(11,13,18,.55)', margin: '0 0 4px 4px', textAlign: 'left' },
  nameLabelUser: { fontSize: 12, color:'rgba(11,13,18,.55)', margin: '0 4px 4px 0', textAlign: 'right' },

  /* Reactions */
  reactRow: { display:'flex', gap:8, alignItems:'center', margin:'6px 6px 0 6px' },
  likeBtn: {
    border:'1px solid rgba(17,17,17,0.14)',
    background:'transparent',
    color:'#0B0D12',
    borderRadius:999,
    padding:'2px 8px',
    fontSize:12,
    cursor:'pointer'
  },
  likeBtnActive: {
    border:'1px solid rgba(255,214,0,0.6)',
    background:'rgba(255,214,0,0.12)',
    color:'#7A5A00',
    borderRadius:999,
    padding:'2px 8px',
    fontSize:12,
    cursor:'pointer'
  },
  likeBadge: {
    fontSize:12,
    color:'#7A5A00',
    background:'rgba(255,214,0,0.14)',
    border:'1px solid rgba(255,214,0,0.35)',
    borderRadius:999,
    padding:'2px 8px'
  },

  /* Chat surface */
  chatWrap: { display:'flex', flexDirection:'column', gap:12 },
  chatStream: {
    background:'#FFFFFF',
    border:'1px solid rgba(17,17,17,0.08)',
    borderRadius:16,
    padding:16,
    minHeight:380,
    maxHeight:540,
    overflowY:'auto',
    boxShadow:'0 10px 24px rgba(17,17,17,.06)'
  },

  /* Bubbles */
  bubbleAI: {
    maxWidth:'85%',
    background:'#F8FAFC',
    padding:'12px 14px',
    borderRadius:12,
    border:'1px solid rgba(17,17,17,0.08)',
    margin:'8px 0',
    backdropFilter:'blur(2px)',
    fontWeight:600,
    letterSpacing:.1,
    lineHeight:1.7,
    color:'#0B0D12'
  },
  bubbleUser: {
    maxWidth:'85%',
    background:'#FFF8CC',
    padding:'12px 14px',
    borderRadius:12,
    border:'1px solid rgba(255,214,0,0.45)',
    margin:'8px 0 8px auto',
    color:'#0B0D12'
  },
  bubbleText: {
    fontSize:15,
    lineHeight:1.6,
    whiteSpace:'normal',
    wordBreak:'break-word',
    overflowWrap:'anywhere',
  },

  /* Buttons */
  btn: {
    padding:'12px 16px',
    borderRadius:14,
    border:'0',
    background:'#FFD600',
    color:'#111',
    fontWeight:900,
    cursor:'pointer',
    letterSpacing:.2,
    boxShadow:'0 0 0 1px rgba(17,17,17,0.05) inset, 0 8px 18px rgba(17,17,17,.12)'
  },
  btnGhost: {
    padding:'12px 16px',
    borderRadius:14,
    border:'1px solid rgba(17,17,17,0.14)',
    background:'transparent',
    color:'#0B0D12',
    fontWeight:820,
    cursor:'pointer'
  },

  /* Inputs */
  input: {
    width:'100%',
    padding:'12px 14px',
    borderRadius:12,
    border:'1px solid rgba(17,17,17,0.12)',
    background:'#FFFFFF',
    color:'#0B0D12',
    outline:'none',
    boxShadow:'0 0 0 0 rgba(255,214,0,0)',
  },
  textarea: {
    width:'100%',
    padding:'12px 14px',
    borderRadius:12,
    border:'1px solid rgba(17,17,17,0.12)',
    background:'#FFFFFF',
    color:'#0B0D12',
    outline:'none',
    resize:'vertical',
    boxShadow:'0 0 0 0 rgba(255,214,0,0)'
  },

  /* Last wish pill */
  lastWish: {
    marginTop:12,
    padding:12,
    border:'1px dashed rgba(255,214,0,0.45)',
    borderRadius:12,
    background:'linear-gradient(180deg, rgba(255,214,0,0.12), rgba(255,214,0,0.06))'
  },

  /* Checklist */
  checklist: { listStyle:'none', paddingLeft:0, margin:'8px 0 12px' },
  checkItem: {
    padding:'10px 12px',
    borderRadius:12,
    background:'#F9FAFB',
    marginBottom:8,
    border:'1px solid rgba(17,17,17,0.08)'
  },
  checkLabel: { display:'flex', gap:10, alignItems:'center', cursor:'pointer', color:'#0B0D12' },
  checkbox: { width:18, height:18, accentColor:'#FFD600' },

  /* Chat composer */
  chatInputRow: { display:'flex', gap:10, alignItems:'center' },
  chatInput: {
    flex:1,
    padding:'12px 14px',
    borderRadius:12,
    border:'1px solid rgba(17,17,17,0.12)',
    background:'#FFFFFF',
    color:'#0B0D12',
    outline:'none',
  },
}


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
   Checklist generation — references wish, block, micro
   ========================= */
function generateChecklist({ wish='', block='', micro='' }) {
  const W = (wish || '').trim()
  const B = (block || '').trim()
  const M = (micro || '').trim()
  const w = W.toLowerCase()
  const b = B.toLowerCase()

  const has = (s, keys) => keys.some(k => s.includes(k))
  const intent =
    has(w, ['revenue','sales','sell','checkout','order','buy','customers','aov','payhip','shopify','product','offer']) ? 'sales' :
    has(w, ['video','short','reel','tiktok','yt','youtube','clip'])                                             ? 'video' :
    has(w, ['email','newsletter','aweber','list','broadcast'])                                                   ? 'email' :
    has(w, ['ad','ads','meta','facebook','google','tiktok ads','campaign'])                                      ? 'ads' :
    has(w, ['landing','page','funnel','vsl','quiz','bridge','optin','thank you','preframe'])                     ? 'landing' :
    has(w, ['blog','seo','rank','article','post'])                                                               ? 'seo' :
    has(w, ['post','tweet','x.com','thread','instagram','ig','story'])                                           ? 'social' :
    has(w, ['meditation','audio','track','hypnosis','bundle'])                                                   ? 'product' :
    'generic'

  let step1 = B
    ? `Neutralize the block “${B}”. Set a 30-minute focus window and remove one friction (phone off / tab close / clear desk).`
    : `Set a 30-minute focus window. Phone on DND. One tab only.`

  if (has(b, ['overwhelm','busy','time']))      step1 = `Calendar 30 minutes for "${W}". Phone on DND. One tab only.`
  if (has(b, ['fear','scared','doubt','confidence'])) step1 = `2-minute pre-game: breathe, visualize "${W}" done, press go.`
  if (has(b, ['tech','setup','domain','pixel','tracking'])) step1 = `Open the tool you need for "${W}". Complete one required field. Save once.`
  if (has(b, ['money','budget','cost']))        step1 = `Pick the $0 version to advance "${W}". Ship first, upgrade later.`
  if (has(b, ['perfection','perfect','procrast'])) step1 = `Draft ugly first for "${W}". 15-minute limit. Done > perfect.`

  const step2 = M ? `Do your micro-move now: "${M}". Start timer (15m).` : `Choose the smallest action toward “${W}” and do it now (15m).`

  let step3 = `Publish proof of progress for “${W}” (one message, one person, one platform).`
  switch (intent) {
    case 'sales':   step3 = `Publish one offer link for “${W}” (story/post/email). First line = CTA.`; break
    case 'video':   step3 = `Record one 30–45s clip about “${W}”. Upload with first-line CTA.`; break
    case 'email':   step3 = `Send one 5-sentence email about “${W}” with a single CTA link.`; break
    case 'ads':     step3 = `Launch 1 ad set for “${W}”: 1 audience, 1 creative. Turn it on.`; break
    case 'landing': step3 = `Ship the page for “${W}”: add hero headline + one gold CTA. Go live.`; break
    case 'seo':     step3 = `Publish an outline post for “${W}” (H1/H2 + 200 words). Link it in nav.`; break
    case 'social':  step3 = `Post one social update about “${W}” with a hard CTA in line 1.`; break
    case 'product': step3 = `Update the product page for “${W}”: 3 bullets + hero image + buy link. Publish.`; break
  }

  return [
    { id: 's1', text: step1, done: false },
    { id: 's2', text: step2, done: false },
    { id: 's3', text: step3, done: false },
  ]
}

function capitalizeFirst(s){ if(!s) return s; return s[0].toUpperCase()+s.slice(1) }
