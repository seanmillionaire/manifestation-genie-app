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
    wish:  "What’s the #1 thing you want to manifest? Say it like you mean it.",
    block: "What’s blocking you? Drop the excuse in one line.",
    micro: "What’s 1 micro-move you can make today? Something small."
  },
  rewards: [
    "YES! That’s the one. Door unlocked.",
    "Love it. The signal’s clear — time to move.",
    "Locked in. You're ready. Execute time.",
    "Noted. The window’s open. Step through."
  ],
  closing:  "The lamp dims… but the magic stays with you.",
  tinyCTA:  "New wish or keep walking the path we opened?"
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
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
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
function getAnnouncedDate() { try { return localStorage.getItem(STREAK_ANNOUNCED_KEY) || null } catch { return null } }
function setAnnouncedToday() { try { localStorage.setItem(STREAK_ANNOUNCED_KEY, getToday()) } catch {} }

// Social-format helpers
const toSocialLines = (text='', wordsPerLine=9) => {
  const soft = text.replace(/\r/g,'')
                   .replace(/([.!?])\s+/g, '$1\n')
                   .replace(/\s+[-–—]\s+/g, '\n')
  const lines = []
  for (const piece of soft.split(/\n+/)) {
    const words = piece.trim().split(/\s+/).filter(Boolean)
    if (!words.length) continue
    for (let i = 0; i < words.length; i += wordsPerLine) {
      lines.push(words.slice(i, i + wordsPerLine).join(' '))
    }
  }
  return lines.join('\n')
}
const nl2br = (s='') => s.replace(/\n/g, '<br/>')

// --- Pretty + cosmic formatting for Genie replies ---
const cosmicOutros = [
  "The stars tilt toward {topic}. ✨",
  "Orbit set; trajectory locked. 🔮",
  "The lamp hums in your direction. 🌙",
  "Gravity favors your move. 🌌",
  "Signals aligned; door unlocked. 🗝️"
]
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
]
function explainLine(line='') {
  const L = line.trim()
  if (!L) return ''
  if (/(The lamp|orbit|stars|gravity|cosmos|Signals aligned)/i.test(L)) return L
  let add = null
  for (const [key, meta] of COSMIC_METAPHORS) {
    if (new RegExp(`\\b${key}`, 'i').test(L)) { add = meta; break }
  }
  if (!add) add = 'Do it small and soon—momentum makes its own magic.'
  const hasEmoji = /^[^\w\s]/.test(L)
  const base = hasEmoji ? L : `✨ ${L}`
  return `${base}\n<span style="opacity:.8">— ${add}</span>`
}
function wittyCloser(topic='this') {
  const z = [
    `I’ll hold the lamp; you push the door on “${topic}.”`,
    `Pro tip: perfection is a black hole—aim for orbit.`,
    `If the muse calls, let it go to voicemail—ship first.`,
    `Cosmos math: tiny action × today > giant plan × someday.`,
  ]
  return z[Math.floor(Math.random()*z.length)]
}
function ensureNoNumberedLists(s='') { return s.replace(/^\s*\d+\.\s*/gm, '• ').replace(/^\s*-\s*/gm, '• ') }
function bulletize(s='') {
  return s.split(/\n+/).map(L0 => {
    const L = L0.trim()
    if (!L) return ''
    if (/^(•|\*|–|-)/.test(L)) return L.replace(/^(•|\*|–|-)\s*/, '')
    if (/^(step|do|try|next|then|now|contact|create|assess|visualize|message|record|post|ship|book|schedule|prepare|explore)\b/i.test(L)) {
      const anchors = ["🌌","🔑","💰","🌀","✨"]
      return `${anchors[Math.floor(Math.random()*anchors.length)]} ${L}`
    }
    return L
  }).join('\n')
}
function addCosmicOutro(s='', topic='this') {
  const line = cosmicOutros[Math.floor(Math.random()*cosmicOutros.length)].replace('{topic}', topic)
  if (/(star|orbit|cosmos|universe|galaxy|gravity|lamp|portal)/i.test(s.split('\n').slice(-2).join(' '))) return s
  return `${s}\n\n${line}`
}
function formatGenieReply(raw='', topic='this') {
  const noNums  = ensureNoNumberedLists(raw)
  const bullets = bulletize(noNums)
  const tight = toSocialLines(bullets, 9).split('\n').map(explainLine).join('\n')
  const withOutro = addCosmicOutro(tight, topic)
  const withQuip  = `${withOutro}\n\n${wittyCloser(topic)}`
  return withQuip.trim()
}

/* =========================
   Streak Messages (Brunson-style)
   ========================= */
function streakMessage(count) {
  if (count === 1) return "Day 1 — you showed up. Momentum just started."
  if (count === 2) return "2 days in a row. That’s a pattern forming. Keep it alive."
  if (count === 3) return "3-day streak. You’re building a muscle. Don’t break it tonight."
  if (count >= 4 && count < 7)  return `${count} days straight — proof this isn’t luck. Keep stacking wins.`
  if (count >= 7 && count < 30) return `${count} days. Weekly habit formed — imagine what 30 does.`
  return `${count} days strong — this isn’t a streak anymore, it’s who you are.`
}

/* =========================
   Brunson Daily Streak (localStorage)
   ========================= */
const STREAK_KEY = 'mg_streak'
const LAST_DATE_KEY = 'mg_last_date'
function getToday() { return new Date().toISOString().slice(0,10) }
function getYesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0,10) }
function loadStreak() {
  if (typeof window === 'undefined') return { count: 0, last: null }
  try {
    const count = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10)
    const last  = localStorage.getItem(LAST_DATE_KEY)
    return { count: isNaN(count) ? 0 : count, last }
  } catch { return { count: 0, last: null } }
}
function saveStreak(count, last) {
  try { localStorage.setItem(STREAK_KEY, String(count)); localStorage.setItem(LAST_DATE_KEY, last) } catch {}
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
        <h3 style={styles.h3}>Let's decode your dreams into reality👇</h3>

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
   3-Step Checklist
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
   Messenger-style Chat Console
   ========================= */
function ChatConsole({ thread, onSend, onReset, onToggleLike, firstName, onTypeNextChunk }) {
  const [input, setInput] = useState("")
  const endRef = useRef(null)

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) }, [thread])

  useEffect(() => {
    const typingMsg = thread.find(m => m.role==='assistant' && m.typing)
    if (!typingMsg) return
    const timer = setInterval(() => { onTypeNextChunk?.(typingMsg.id) }, 16) // ~60fps
    return () => clearInterval(timer)
  }, [thread, onTypeNextChunk])

  return (
    <div style={styles.chatWrap}>
      <div style={styles.chatStream}>
        {thread.map((m) => {
          const isAI = m.role === 'assistant'
          return (
            <div key={m.id} style={isAI ? styles.rowAI : styles.rowUser}>
              <div style={styles.avatar}>{isAI ? '🔮' : '🙂'}</div>
              <div style={{flex:1, minWidth:0}}>
                <div style={isAI ? styles.nameLabelAI : styles.nameLabelUser}>
                  {isAI ? 'Genie' : (m.author || firstName || 'You')}
                </div>
                <div style={isAI ? styles.bubbleAI : styles.bubbleUser}>
                  <div
                    style={styles.bubbleText}
                    dangerouslySetInnerHTML={{__html: m.content + (m.typing ? '<span style="opacity:.6">▋</span>' : '')}}
                  />
                </div>
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
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return thread.map(m => ({ role: m.role, content: strip(m.content || '') }))
}
function createTypingMsg(html) {
  return {
    id: newId(),
    role: 'assistant',
    author: 'Genie',
    content: '',
    full: html,
    typing: true,
    likedByUser: false,
    likedByGenie: false
  }
}
function typeNextChunkOnThread(setThread, id, stepChars=2) {
  setThread(prev => prev.map(m => {
    if (m.id !== id || !m.typing) return m
    const nextLen = Math.min((m.content || '').length + stepChars, (m.full || '').length)
    const next = (m.full || '').slice(0, nextLen)
    const done = nextLen >= (m.full || '').length
    return { ...m, content: next, typing: !done }
  }))
}

export default function ChatPage() {
  // FIRST NAME: cache first; hydrate from Supabase
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

  // greeting + thread
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
          fn = (meta.full_name?.trim().split(' ')[0]) || (meta.name?.trim().split(' ')[0]) || meta.given_name || null
        }
        if (!fn) fn = (user.email || '').split('@')[0] || 'Friend'
        if (alive) {
          setFirstName(fn)
          try { localStorage.setItem(NAME_KEY, fn) } catch {}
          setPhase(prev => (prev !== 'chat' && prev !== 'checklist' && prev !== 'questionnaire' && !vibe) ? 'vibe' : prev)
        }
      } catch {}
    })()
    return () => { alive = false }
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
    if (last === today) { setStreak(count) }
    else if (last === getYesterday()) { setStreak(count + 1); saveStreak(count + 1, today) }
    else { setStreak(1); saveStreak(1, today) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist state
  useEffect(()=>{ saveState({ phase, vibe, currentWish, lastWish, steps, thread }) }, [phase, vibe, currentWish, lastWish, steps, thread])

  // Scroll to top on phase change
  useEffect(() => { if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }, [phase])

  // Announce streak once when entering chat
  useEffect(() => {
    if (phase !== 'chat') return
    const today = getToday()
    const already = getAnnouncedDate() === today
    if (already) { if (!hasAnnouncedStreak) setHasAnnouncedStreak(true); return }
    if (!hasAnnouncedStreak) {
      setThread(prev => prev.concat({
        id: newId(),
        role: 'assistant',
        author: 'Genie',
        content: nl2br(escapeHTML(`${streakMessage(streak)}\nKeep the streak alive — what’s today’s micro-move?`)),
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
      if ((steps || []).length) setPhase('checklist')
      else setPhase('questionnaire')
      setThread(prev => prev.concat({
        role:'assistant',
        content: `We’ll keep weaving the last wish: <b>${escapeHTML(chosen.wish)}</b>.`
      }))
    } else {
      setPhase('questionnaire')
      setThread(prev => prev.concat({ role:'assistant', content: "No past wish found. Let’s light
