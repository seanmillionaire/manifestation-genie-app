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
  vibePrompt: "Pick your signal: 🔥 Bold, 🙏 Calm, 💰 Rich. What are we riding today?",
  resumeOrNew: "Continue the last wish, or spark a fresh one?",
  resumeLabel: "Continue last wish",
  newLabel: "Start a new wish",
  questPrompts: {
    wish: "What’s the outcome you’re chasing? Say it like a headline.",
    block: "What’s the block? Drop the excuse in one line.",
    micro: "What’s your next micro-move? One action. Today."
  },
  rewards: [
    "Bang. That’s the code. Door unlocked.",
    "Clean. The signal’s clear — move.",
    "Locked in. Energy up. Execute.",
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
   Minimal Chat Console
   ========================= */
function ChatConsole({ thread, onSend, onReset }) {
  const [input, setInput] = useState("")
  const endRef = useRef(null)
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) }, [thread])

  return (
    <div style={styles.chatWrap}>
      <div style={styles.chatStream}>
        {thread.map((m, i) => (
          <div key={i} style={m.role === 'assistant' ? styles.bubbleAI : styles.bubbleUser}>
            <div style={styles.bubbleText} dangerouslySetInnerHTML={{__html: m.content}} />
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div style={styles.chatInputRow}>
        <input
          value={input}
          onChange={(e)=>setInput(e.target.value)}
          placeholder="Speak to your Genie…"
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
export default function ChatPage() {
  // FIRST NAME: cache first; hydrate from Supabase (profiles → metadata → email)
  const [firstName, setFirstName] = useState(getFirstNameFromCache())

  // phases: welcome → vibe → resumeNew → questionnaire → checklist → chat
  const [phase, setPhase] = useState('welcome')
  const [vibe, setVibe] = useState(null) // 'BOLD' | 'CALM' | 'RICH'
  const [currentWish, setCurrentWish] = useState(null) // {wish, block, micro, vibe, date}
  const [lastWish, setLastWish] = useState(null)
  const [steps, setSteps] = useState([]) // checklist steps

  // greeting seeded with name
  const [greeting] = useState(() => injectName(pick(GenieLang.greetings), firstName))
  const [thread, setThread] = useState([{ role:'assistant', content: greeting }])

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

  const handleSend = async (text) => {
    setThread(prev => prev.concat({ role:'user', content: escapeHTML(text) }))
    const reply = await fakeGenieReply(text, { vibe, currentWish }) // stub; replace with /api/chat
    setThread(prev => prev.concat({ role:'assistant', content: reply }))
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


        {/* Magical Chat */}
        {phase === 'chat' && (
          <ChatConsole thread={thread} onSend={handleSend} onReset={resetToNewWish} />
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

/* =========================
   Fake reply (stub)
   Replace with real /api/chat call
   ========================= */
async function fakeGenieReply(text, { vibe, currentWish }) {
  const vibeLine = vibe ? `${emojiFor(vibe)} ${titleCase(vibe)} ` : ''
  const wishLine = currentWish?.wish ? `Your target is <b>${escapeHTML(currentWish.wish)}</b>. ` : ''
  return `${vibeLine}Got it. ${wishLine}Do the next small move (“<i>${escapeHTML(currentWish?.micro || 'one small step')}</i>”). 
  Then say: <b>“Genie, step done.”</b> I’ll open the next door. ✨`
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
  bubbleAI: {
    maxWidth:'85%',
    background:'rgba(255,255,255,0.04)',
    padding:'12px 14px',
    borderRadius:12,
    border:'1px solid rgba(255,255,255,0.08)',
    margin:'8px 0',
    backdropFilter:'blur(2px)'
  },
  bubbleUser: {
    maxWidth:'85%',
    background:'rgba(255,214,0,0.08)',
    padding:'12px 14px',
    borderRadius:12,
    border:'1px solid rgba(255,214,0,0.18)',
    margin:'8px 0 8px auto'
  },
  bubbleText: { fontSize:15, lineHeight:1.6 },
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
function generateChecklist({ wish='', block='', micro='' }) {
  const clean = (s) => (s || '').toLowerCase()

  const w = clean(wish)
  const b = clean(block)
  const m = clean(micro)

  // Heuristic helpers
  const contains = (s, arr) => arr.some(k => s.includes(k))

  // Step 1 — remove friction tied to the block
  let step1 = 'Remove the friction you just named.'
  if (contains(b, ['overwhelm','busy','time'])) step1 = 'Block 30 minutes. Phone on Do Not Disturb.'
  else if (contains(b, ['fear','scared','doubt','confidence'])) step1 = '2-minute pre-game: breathe, visualize the outcome, press go.'
  else if (contains(b, ['money','budget','cost','expensive'])) step1 = 'Pick the $0 version. Ship first, upgrade later.'
  else if (contains(b, ['tech','setup','domain','pixel','tracking'])) step1 = 'Open the tool. Complete the first input. Save once.'

  // Step 2 — the user’s micro-move (always)
  const step2 = m ? capitalizeFirst(m) : 'Do the smallest version right now.'

  // Step 3 — proof & publish based on intent
  let step3 = 'Post proof of progress (one message, one person, one platform).'
  if (contains(w, ['revenue','sales','sell','checkout','order'])) step3 = 'Publish one offer link publicly (story/post/email).'
  else if (contains(w, ['video','short','youtube','tiktok'])) step3 = 'Upload one clip with a CTA in the first line.'
  else if (contains(w, ['email','list','newsletter'])) step3 = 'Send one email with a single CTA link.'
  else if (contains(w, ['ads','meta','facebook','google'])) step3 = 'Launch one ad set (1 audience, 1 creative).'

  return [
    { id: 's1', text: step1, done: false },
    { id: 's2', text: step2, done: false },
    { id: 's3', text: step3, done: false },
  ]
}
function capitalizeFirst(s){ if(!s) return s; return s[0].toUpperCase()+s.slice(1) }
