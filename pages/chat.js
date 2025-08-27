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
const STREAK_KEY = 'mg_streak'
const LAST_DATE_KEY = 'mg_last_date'

function getToday() {
  return new Date().toISOString().slice(0,10)
}

function loadStreak() {
  if (typeof window === 'undefined') return { count: 0, last: null }
  try {
    const count = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10)
    const last = localStorage.getItem(LAST_DATE_KEY)
    return { count, last }
  } catch {
    return { count: 0, last: null }
  }
}

function saveStreak(count, last) {
  try {
    localStorage.setItem(STREAK_KEY, String(count))
    localStorage.setItem(LAST_DATE_KEY, last)
  } catch {}
}

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
const toSocialLines = (text='', wordsPerLine=9) => {
  const soft = text
    .replace(/\r/g,'')
    // add breaks after sentence ends or dashes if missing
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

function ensureNoNumberedLists(s='') {
  // Replace leading "1. / 2." etc with emoji bullets
  return s
    .replace(/^\s*\d+\.\s*/gm, '• ')
    .replace(/^\s*-\s*/gm, '• ');
}

function bulletize(s='') {
  // Turn lines that read like steps into emoji bullets
  return s.split(/\n+/).map(line => {
    const L = line.trim();
    if (!L) return '';
    if (/^(•|\*|–|-)/.test(L)) return L.replace(/^(•|\*|–|-)\s*/, ''); // strip markers
    if (/^(step|do|try|next|then|now|contact|create|assess|visualize|message|record|post|ship|book)\b/i.test(L)) {
      // looks like an action line → emoji anchor
      const anchors = ["🌌","🔑","💰","🌀","✨"];
      return `${anchors[Math.floor(Math.random()*anchors.length)]} ${L}`;
    }
    return L;
  }).join('\n');
}

function addCosmicOutro(s='', topic='this') {
  const line = cosmicOutros[Math.floor(Math.random()*cosmicOutros.length)].replace('{topic}', topic);
  // Avoid double outro if one already exists
  if (/(star|orbit|cosmos|universe|galaxy|gravity|lamp|portal)/i.test(s.split('\n').slice(-2).join(' '))) return s;
  return `${s}\n\n${line}`;
}


// Final pass that we’ll call on the LLM reply
function formatGenieReply(raw='', topic='this') {
  const noNums = ensureNoNumberedLists(raw);
  const bullets = bulletize(noNums);
  const tight = toSocialLines(bullets, 9);      // short, chatty lines
  const withOutro = addCosmicOutro(tight, topic);
  return withOutro.trim();
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
   3-Step Checklist (new)
   ========================= */
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
                    // You can like Genie messages
                    <button
                      style={m.likedByUser ? styles.likeBtnActive : styles.likeBtn}
                      onClick={() => onToggleLike(m.id, 'user')}
                      aria-label="Like Genie message"
                    >
                      👍 {m.likedByUser ? 'Liked' : 'Like'}
                    </button>
                  ) : (
                    // Genie may like yours; show badge if so
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
/* Convert UI thread (which may contain HTML) into plain OpenAI messages */
function toPlainMessages(thread) {
  const strip = (s='') => s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '') // strip tags
    .replace(/\s+/g, ' ')
    .trim()

  return thread.map(m => ({
    role: m.role,                           // 'user' or 'assistant'
    content: strip(m.content || '')
  }))
}

           
export default function ChatPage() {
  // FIRST NAME: cache first; hydrate from Supabase (profiles → metadata → email)
  const [firstName, setFirstName] = useState(getFirstNameFromCache())
const [streak, setStreak] = useState(0)

useEffect(() => {
  const today = getToday()
  const { count, last } = loadStreak()

  if (last === today) {
    setStreak(count) // already counted today
  } else if (last === getYesterday()) {
    setStreak(count + 1) // streak continues
    saveStreak(count + 1, today)
  } else {
    setStreak(1) // reset
    saveStreak(1, today)
  }
}, [])
function getYesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0,10)
}

  // phases: welcome → vibe → resumeNew → questionnaire → checklist → chat
  const [phase, setPhase] = useState('welcome')
  const [vibe, setVibe] = useState(null) // 'BOLD' | 'CALM' | 'RICH'
  const [currentWish, setCurrentWish] = useState(null) // {wish, block, micro, vibe, date}
  const [lastWish, setLastWish] = useState(null)
  const [steps, setSteps] = useState([]) // checklist steps

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

        // profiles.full_name
        try {
          const { data: p } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle()
          if (p?.full_name) fn = String(p.full_name).trim().split(' ')[0]
        } catch {}

        // metadata fallbacks
        if (!fn) {
          const meta = user.user_metadata || {}
          fn =
            (meta.full_name?.trim().split(' ')[0]) ||
            (meta.name?.trim().split(' ')[0]) ||
            meta.given_name ||
            null
        }

        // email fallback
        if (!fn) fn = (user.email || '').split('@')[0] || 'Friend'

        if (alive) {
          setFirstName(fn)
          try { localStorage.setItem(NAME_KEY, fn) } catch {}
        }
      } catch {}
    })()
    return () => { alive = false }
  }, [])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist state
  useEffect(()=>{ saveState({ phase, vibe, currentWish, lastWish, steps, thread }) }, [phase, vibe, currentWish, lastWish, steps, thread])

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
      // go straight to checklist if we already had steps; else questionnaire
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

  // Questionnaire → Checklist
  const handleQuestComplete = (data) => {
    setCurrentWish(data)
    setLastWish(data)
    const generated = generateChecklist(data)
    setSteps(generated)
    setPhase('checklist')
    setThread(prev => prev.concat(
      { role:'assistant', content: `Wish set: <b>${escapeHTML(data.wish)}</b>.` },
      { role:'assistant', content: pick(GenieLang.rewards) },
      { role:'assistant', content: `Do these three now, then we talk. ${firstName}, speed > perfect.` }
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

// Genie sometimes likes your message (wins or at random)
const maybeGenieLikes = (msg) => {
  const t = (msg.content || '').toLowerCase()
  const isWin = /(done|shipped|published|posted|sold|launched|emailed|uploaded|completed|locked in)/.test(t)
  const shouldLike = isWin || Math.random() < 0.25
  if (!shouldLike) return
  // flip likedByGenie on that message id
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

try {
  const reply = await genieReply({ text, thread, firstName, currentWish, vibe })
  const topic = (currentWish?.wish || text || 'this').toLowerCase().slice(0, 80);
  const pretty = formatGenieReply(reply, topic);
  const aiMsg = {
    id: newId(),
    role: 'assistant',
    author: 'Genie',
    content: nl2br(escapeHTML(pretty)),  // keep <br/> for lines
    likedByUser: false,
    likedByGenie: false
  }
  setThread(prev => prev.concat(aiMsg))
} catch (e) {
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
    setThread([{ role:'assistant', content: injectName(pick(GenieLang.greetings), firstName) }])
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

        {/* Vibe under welcome */}
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

        {/* NEW: Checklist */}
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


useEffect(() => {
  if (phase === 'chat' && thread.length === 1) {
    setThread(prev => prev.concat({
      id: newId(),
      role: 'assistant',
      author: 'Genie',
      content: `🔥 Lamp lit ${streak} day${streak>1?'s':''} in a row. Doors opened: ${streak * 3}. Keep the flame alive tonight. ✨`,
      likedByUser:false, likedByGenie:false
    }))
  }
}, [phase])

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
  /* ===== Portal Header ===== */
  portalHeader: { textAlign:'left', marginBottom:18 },
  portalTitle: { fontSize:34, fontWeight:900, margin:0, color:'#ffd600', letterSpacing:.3 },
  portalSubtitle: { fontSize:18, opacity:.92, marginTop:6 },

  /* ===== Page + Container ===== */
  wrap: {
    minHeight:'100vh',
    color:'#f2f2f6',
    padding:'24px',
    background: 'radial-gradient(1200px 600px at 50% -10%, #1a1b2d 0%, #0c0d14 55%, #090a10 100%)',
  },
  container: { maxWidth: 860, margin:'0 auto' },

  /* ===== Cards ===== */
  card: {
    background:'#171826',
    border:'1px solid rgba(255,255,255,0.06)',
    borderRadius:18,
    padding:24,
    boxShadow:'0 18px 40px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,0.02)'
  },

  /* ===== Typography ===== */
  h2: { margin:0, fontSize:28, fontWeight:900, letterSpacing:.3 },
  h3: { marginTop:0, fontSize:22, fontWeight:850 },
  lead: { fontSize:18, opacity:.96, lineHeight:1.45 },
  subtle: { fontSize:15, opacity:.86, lineHeight:1.45 },
  mini: { fontSize:13, opacity:.82 },

  /* ===== Layout bits ===== */
  row: { display:'flex', gap:12, marginTop:12, flexWrap:'wrap' },
  vibeRow: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginTop:12 },

  /* ===== Buttons ===== */
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
   // In styles
/* Messenger rows */
rowAI:   { display:'flex', gap:10, alignItems:'flex-start', margin:'10px 0' },
rowUser: { display:'flex', gap:10, alignItems:'flex-start', margin:'10px 0', flexDirection:'row-reverse' },
avatar:  { width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 },
nameLabelAI: {
  fontSize: 12,
  opacity: .7,
  margin: '0 0 4px 4px',
  textAlign: 'left'
},
nameLabelUser: {
  fontSize: 12,
  opacity: .7,
  margin: '0 4px 4px 0',
  textAlign: 'right'
},


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
  fontWeight: 600,          // was 700
  letterSpacing: .1,
  lineHeight: 1.7           // more air for short lines
},


  btn: {
    padding:'12px 16px',
    borderRadius:14,
    border:'0',
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

  /* ===== Inputs ===== */
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

  /* ===== Last Wish pill ===== */
  lastWish: {
    marginTop:12,
    padding:12,
    border:'1px dashed rgba(255,255,255,0.18)',
    borderRadius:12,
    background:'linear-gradient(180deg, rgba(255,214,0,0.05), rgba(255,214,0,0.02))'
  },

  /* ===== Checklist ===== */
  checklist: { listStyle:'none', paddingLeft:0, margin:'8px 0 12px' },
  checkItem: { padding:'10px 12px', borderRadius:12, background:'rgba(255,255,255,0.03)', marginBottom:8, border:'1px solid rgba(255,255,255,0.06)' },
  checkLabel: { display:'flex', gap:10, alignItems:'center', cursor:'pointer' },
  checkbox: { width:18, height:18, accentColor:'#ffd600' },

  /* ===== Chat ===== */
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
 
  bubbleUser: {
    maxWidth:'85%',
    background:'rgba(255,214,0,0.08)',
    padding:'12px 14px',
    borderRadius:12,
    border:'1px solid rgba(255,214,0,0.18)',
    margin:'8px 0 8px auto'
  },
bubbleText: {
  fontSize: 15,
  lineHeight: 1.6,
  whiteSpace: 'normal',  // we’re using <br/>
  wordBreak: 'break-word',
   overflowWrap: 'anywhere',
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
   Checklist generation (simple, sharp)
   ========================= */
/* =========================
   Checklist generation — references wish, block, micro
   ========================= */
function generateChecklist({ wish='', block='', micro='' }) {
  const W = (wish || '').trim()
  const B = (block || '').trim()
  const M = (micro || '').trim()
  const w = W.toLowerCase()
  const b = B.toLowerCase()

  // Intent classifier (very lightweight)
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

  // Step 1 — remove friction tied to the block, explicitly reference it
  let step1 = B
    ? `Neutralize the block “${B}”. Set a 30-minute focus window and remove one friction (phone off / tab close / clear desk).`
    : `Set a 30-minute focus window. Phone on DND. One tab only.`

  if (has(b, ['overwhelm','busy','time']))      step1 = `Calendar 30 minutes for "${W}". Phone on DND. One tab only.`
  if (has(b, ['fear','scared','doubt','confidence']))
                                                step1 = `2-minute pre-game: breathe, visualize "${W}" done, press go.`
  if (has(b, ['tech','setup','domain','pixel','tracking']))
                                                step1 = `Open the tool you need for "${W}". Complete one required field. Save once.`
  if (has(b, ['money','budget','cost']))        step1 = `Pick the $0 version to advance "${W}". Ship first, upgrade later.`
  if (has(b, ['perfection','perfect','procrast'])) 
                                                step1 = `Draft ugly first for "${W}". 15-minute limit. Done > perfect.`

  // Step 2 — force the user’s micro-move (always referenced)
  const step2 = M ? `Do your micro-move now: "${M}". Start timer (15m).` : `Choose the smallest action toward “${W}” and do it now (15m).`

  // Step 3 — intent-specific publish/proof step (referencing the wish)
  let step3 = `Publish proof of progress for “${W}” (one message, one person, one platform).`

  switch (intent) {
    case 'sales':
      step3 = `Publish one offer link for “${W}” (story/post/email). First line = CTA.`;
      break
    case 'video':
      step3 = `Record one 30–45s clip about “${W}”. Upload with first-line CTA.`;
      break
    case 'email':
      step3 = `Send one 5-sentence email about “${W}” with a single CTA link.`;
      break
    case 'ads':
      step3 = `Launch 1 ad set for “${W}”: 1 audience, 1 creative. Turn it on.`;
      break
    case 'landing':
      step3 = `Ship the page for “${W}”: add hero headline + one gold CTA. Go live.`;
      break
    case 'seo':
      step3 = `Publish an outline post for “${W}” (H1/H2 + 200 words). Link it in nav.`;
      break
    case 'social':
      step3 = `Post one social update about “${W}” with a hard CTA in line 1.`;
      break
    case 'product':
      step3 = `Update the product page for “${W}”: 3 bullets + hero image + buy link. Publish.`;
      break
    default:
      // keep default above
      break
  }

  return [
    { id: 's1', text: step1, done: false },
    { id: 's2', text: step2, done: false },
    { id: 's3', text: step3, done: false },
  ]
}

function capitalizeFirst(s){ if(!s) return s; return s[0].toUpperCase()+s.slice(1) }
