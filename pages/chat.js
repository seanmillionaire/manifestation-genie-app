// pages/chat.js — Manifestation Genie (White Theme + Oath Gate)
// Flow: oath → vibe → resumeNew → questionnaire → checklist → chat
export default function ChatPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null; // prevent SSR/CSR mismatch

  // ...existing ChatPage code...
}

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'

/* =========================
   Config / Language
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
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null } catch { return null }
}
const saveState = (state) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {} }
const getFirstNameFromCache = () => {
  try {
    const saved = localStorage.getItem(NAME_KEY)
    if (saved && saved.trim()) return saved.trim().split(' ')[0]
  } catch {}
  return 'Friend'
}
function escapeHTML(s=''){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) }

/* =========================
   Oath Gate (local persistence)
   ========================= */
const OATH_KEY = 'mg_oath_ok'
function hasOathAccepted(){ try { return localStorage.getItem(OATH_KEY) === 'yes' } catch { return false } }
function markOathAccepted(){ try { localStorage.setItem(OATH_KEY, 'yes') } catch {} }

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
        <textarea value={wish} onChange={e=>setWish(e.target.value)} placeholder="One line. No fluff." style={styles.textarea} rows={3} />

        <p style={{...styles.subtle, marginTop:16}}>{GenieLang.questPrompts.block}</p>
        <textarea value={block} onChange={e=>setBlock(e.target.value)} placeholder="Say the snag. Simple + true." style={styles.textarea} rows={2} />

        <p style={{...styles.subtle, marginTop:16}}>{GenieLang.questPrompts.micro}</p>
        <input value={micro} onChange={e=>setMicro(e.target.value)} placeholder="Send it. Start it. Ship it." style={styles.input} />

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
      <h3 style={styles.h3}>Do this now for: <span style={{opacity:.9}}>"{wish || 'your wish'}"</span></h3>
      <ul style={styles.checklist}>
        {steps.map((s, i) => (
          <li key={s.id} style={styles.checkItem}>
            <label style={styles.checkLabel}>
              <input type="checkbox" checked={!!s.done} onChange={() => onToggle(s.id)} style={styles.checkbox} />
              <span>{i+1}. {s.text}</span>
            </label>
          </li>
        ))}
      </ul>
      <div style={styles.row}>
        <button style={{...styles.btn, opacity: allDone ? 1 : .65, cursor: allDone ? 'pointer' : 'not-allowed'}} disabled={!allDone} onClick={onComplete}>All done → Enter chat</button>
        <button style={styles.btnGhost} onClick={onSkip}>Skip for now</button>
      </div>
      {micro ? <p style={{...styles.mini, marginTop:10}}>Your micro-move: <b>{micro}</b></p> : null}
    </div>
  )
}

/* =========================
   Chat Console
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
              <div style={styles.avatar}>{isAI ? '🔮' : '🙂'}</div>
              <div style={{flex:1, minWidth:0}}>
                <div style={isAI ? styles.nameLabelAI : styles.nameLabelUser}>
                  {isAI ? 'Genie' : (m.author || firstName || 'You')}
                </div>
                <div style={isAI ? styles.bubbleAI : styles.bubbleUser}>
                  <div style={styles.bubbleText} dangerouslySetInnerHTML={{__html: m.content}} />
                </div>
                <div style={styles.reactRow}>
                  {isAI ? (
                    <button style={m.likedByUser ? styles.likeBtnActive : styles.likeBtn} onClick={() => onToggleLike(m.id, 'user')}>👍 {m.likedByUser ? 'Liked' : 'Like'}</button>
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
        <button style={styles.btn} onClick={()=>{ if(input.trim()){ onSend(input.trim()); setInput('') } }}>Send</button>
        <button style={styles.btnGhost} onClick={onReset}>New wish</button>
      </div>
    </div>
  )
}

/* =========================
   Manifestation Oath Gate
   ========================= */
function ManifestationOath({ onAgree }) {
  const secrets = [
    "Action magnetizes luck. Tiny act now > perfect plan later.",
    "Emotion is the engine of manifestation—feel it first, then move.",
    "Clarity compresses time. Name the target in one line.",
    "Energy follows attention—guard your focus like treasure.",
    "Identity precedes outcome: act as the person who already owns the result."
  ]
  const secret = secrets[Math.floor(Math.random()*secrets.length)]
  const [checked, setChecked] = useState(false)

  return (
    <div style={styles.card}>
      <h2 style={styles.h2}>Before we begin 🔮</h2>
      <p style={styles.lead}>"{secret}"</p>

      <div style={{marginTop:14, padding:12, border:'1px solid rgba(0,0,0,0.12)', borderRadius:12, background:'#fff'}}>
        <label style={{display:'flex', gap:10, alignItems:'flex-start', cursor:'pointer'}}>
          <input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} style={{ width:18, height:18, marginTop:3, accentColor:'#ffd600' }}/>
          <span style={{color:'#111'}}>
            I agree to use this Genie for good, growth, and non-harmful intent. I accept full responsibility for my actions.
          </span>
        </label>
      </div>

      <div style={styles.row}>
        <button
          style={{...styles.btn, opacity: checked ? 1 : .6, cursor: checked ? 'pointer' : 'not-allowed'}}
          disabled={!checked}
          onClick={onAgree}
        >
          I Agree — Enter →
        </button>
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
  return thread.map(m => ({ role: m.role, content: strip(m.content || '') }))
}

export default function ChatPage() {
  // FIRST NAME: cache first; hydrate from Supabase
  const [firstName, setFirstName] = useState(getFirstNameFromCache())

  // phases
  const [phase, setPhase] = useState('oath') // 🚀 show oath first
  const [vibe, setVibe] = useState(null) // 'BOLD' | 'CALM' | 'RICH'
  const [currentWish, setCurrentWish] = useState(null)
  const [lastWish, setLastWish] = useState(null)
  const [steps, setSteps] = useState([])

  // streak state (kept minimal)
  const [streak, setStreak] = useState(0)
  const [hasAnnouncedStreak, setHasAnnouncedStreak] = useState(false)

  // greeting seeded with name
  const [greeting] = useState(() => injectName(pick(GenieLang.greetings), firstName))
  const [thread, setThread] = useState([
    { id:newId(), role:'assistant', author:'Genie', content:greeting, likedByUser:false, likedByGenie:false }
  ])

  // Supabase name hydration + initial gate
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
          // 🔐 Gate: if oath not accepted, force oath; else go to vibe (or keep current)
          setPhase(prev => hasOathAccepted() ? (prev === 'oath' ? 'vibe' : prev) : 'oath')
        }
      } catch {}
    })()
    return () => { alive = false }
  }, [])

  // Load persisted state on mount (but never bypass the oath)
  useEffect(()=>{
    const s = loadState()
    if (s) {
      setVibe(s.vibe || null)
      setCurrentWish(s.currentWish || null)
      setLastWish(s.lastWish || null)
      setSteps(s.steps || [])
      setThread(s.thread?.length ? s.thread : [{role:'assistant', content: injectName(pick(GenieLang.greetings), firstName)}])
      if (hasOathAccepted()) {
        setPhase(s.phase || 'vibe')
      } else {
        setPhase('oath')
      }
    }
    // simple local streak seed
    try {
      const last = localStorage.getItem('mg_last_date')
      const today = todayStr()
      if (last === today) setStreak(parseInt(localStorage.getItem('mg_streak')||'1',10)||1)
      else {
        const next = (last && last !== today) ? (parseInt(localStorage.getItem('mg_streak')||'0',10)||0) + 1 : 1
        localStorage.setItem('mg_streak', String(next))
        localStorage.setItem('mg_last_date', today)
        setStreak(next)
      }
    } catch {}
  }, [])

  // Persist state
  useEffect(()=>{ saveState({ phase, vibe, currentWish, lastWish, steps, thread }) }, [phase, vibe, currentWish, lastWish, steps, thread])

  // Scroll to top on phase change
  useEffect(() => { if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }, [phase])

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
      setThread(prev => prev.concat({ role:'assistant', content: `We’ll keep weaving the last wish: <b>${escapeHTML(chosen.wish)}</b>.` }))
    } else {
      setPhase('questionnaire')
      setThread(prev => prev.concat({ role:'assistant', content: "No past wish found. Let’s light a new one." }))
    }
  }

  const handleNew = () => {
    setCurrentWish(null); setSteps([]); setPhase('questionnaire')
    setThread(prev => prev.concat({ role:'assistant', content: "New star, new path. I’m listening…" }))
  }

  const handleQuestComplete = (data) => {
    setCurrentWish(data); setLastWish(data)
    const generated = generateChecklist(data); setSteps(generated)
    setPhase('checklist')
    setThread(prev => prev.concat(
      { id:newId(), role:'assistant', author:'Genie', content: `Wish set: <b>${escapeHTML(data.wish)}</b>.` },
      { id:newId(), role:'assistant', author:'Genie', content: pick(GenieLang.rewards) },
      { id:newId(), role:'assistant', author:'Genie', content: `Do these three now, then we talk. ${firstName}, speed > perfect.` }
    ))
  }

  const toggleStep = (id) => setSteps(prev => prev.map(s => s.id === id ? {...s, done: !s.done} : s))
  const completeChecklist = () => {
    setPhase('chat')
    setThread(prev => prev.concat({ role:'assistant', content: `Strong move. Checklist complete. Speak, and I’ll shape the path, ${firstName}. ${GenieLang.tinyCTA}` }))
  }
  const skipChecklist = () => {
    setPhase('chat')
    setThread(prev => prev.concat({ role:'assistant', content: `We’ll refine live. Tell me where you’re stuck on “${escapeHTML(currentWish?.wish || 'your goal')}”.` }))
  }

  const onToggleLike = (id, who) => {
    setThread(prev => prev.map(m => {
      if (m.id !== id) return m
      if (who === 'user') return { ...m, likedByUser: !m.likedByUser }
      if (who === 'genie') return { ...m, likedByGenie: !m.likedByGenie }
      return m
    }))
  }

  const handleSend = async (text) => {
    if (!hasOathAccepted()) { setPhase('oath'); return }
    const userMsg = { id: newId(), role: 'user', author: firstName || 'You', content: escapeHTML(text), likedByUser: false, likedByGenie: false }
    setThread(prev => prev.concat(userMsg))

    try {
      const reply = await genieReply({ text, thread, firstName, currentWish, vibe })
      const aiMsg = { id: newId(), role: 'assistant', author: 'Genie', content: escapeHTML(reply), likedByUser: false, likedByGenie: false }
      setThread(prev => prev.concat(aiMsg))
    } catch {
      setThread(prev => prev.concat({ id:newId(), role:'assistant', author:'Genie', content: escapeHTML("The lamp flickered. Try again."), likedByUser:false, likedByGenie:false }))
    }
  }

  const resetToNewWish = () => {
    setPhase('vibe'); setVibe(null); setCurrentWish(null); setSteps([])
    setThread([{ id:newId(), role:'assistant', author:'Genie', content: injectName(pick(GenieLang.greetings), firstName), likedByUser:false, likedByGenie:false }])
    setHasAnnouncedStreak(false)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.container}>
        {/* OATH — must agree before anything else */}
        {phase === 'oath' && (
          <ManifestationOath onAgree={() => { markOathAccepted(); setPhase('vibe') }} />
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
          <Questionnaire initial={currentWish} onComplete={handleQuestComplete} vibe={vibe} firstName={firstName} />
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

/* Hit /api/chat */
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
    body: JSON.stringify({ userName: firstName || null, context, messages: [...toPlainMessages(thread), { role:'user', content:text }] })
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
  portalTitle: { fontSize:34, fontWeight:900, margin:0, color:'#111', letterSpacing:.3 },
  portalSubtitle: { fontSize:18, opacity:.9, marginTop:6, color:'#333' },

  wrap: { minHeight:'100vh', color:'#111', padding:'24px', background:'linear-gradient(180deg, #fff 0%, #f7f7f9 100%)' },
  container: { maxWidth: 860, margin:'0 auto' },

  card: { background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:18, padding:24, boxShadow:'0 6px 22px rgba(0,0,0,0.08)' },

  h2: { margin:0, fontSize:28, fontWeight:900, letterSpacing:.3, color:'#111' },
  h3: { marginTop:0, fontSize:22, fontWeight:850, color:'#111' },
  lead: { fontSize:18, opacity:.9, lineHeight:1.45, color:'#222' },
  subtle: { fontSize:15, opacity:.8, lineHeight:1.45, color:'#444' },
  mini: { fontSize:13, opacity:.7, color:'#666' },

  row: { display:'flex', gap:12, marginTop:12, flexWrap:'wrap' },
  vibeRow: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginTop:12 },

  vibeBtn: {
    padding:'14px 16px',
    borderRadius:14,
    border:'1px solid rgba(0,0,0,0.08)',
    background:'linear-gradient(180deg, #fff 0%, #f2f2f2 100%)',
    color:'#111', cursor:'pointer', textAlign:'center', boxShadow:'0 3px 10px rgba(0,0,0,0.08)'
  },

  // Messenger rows
  rowAI:   { display:'flex', gap:10, alignItems:'flex-start', margin:'10px 0' },
  rowUser: { display:'flex', gap:10, alignItems:'flex-start', margin:'10px 0', flexDirection:'row-reverse' },
  avatar:  { width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 },
  nameLabelAI: { fontSize: 12, opacity: .7, margin: '0 0 4px 4px', textAlign: 'left' },
  nameLabelUser: { fontSize: 12, opacity: .7, margin: '0 4px 4px 0', textAlign: 'right' },

  reactRow: { display:'flex', gap:8, alignItems:'center', margin:'6px 6px 0 6px' },
  likeBtn: { border:'1px solid rgba(0,0,0,0.12)', background:'transparent', color:'#333', borderRadius:999, padding:'2px 8px', fontSize:12, cursor:'pointer' },
  likeBtnActive: { border:'1px solid #ffd600', background:'rgba(255,214,0,0.12)', color:'#b58900', borderRadius:999, padding:'2px 8px', fontSize:12, cursor:'pointer' },
  likeBadge: { fontSize:12, color:'#b58900', background:'rgba(255,214,0,0.1)', border:'1px solid rgba(255,214,0,0.3)', borderRadius:999, padding:'2px 8px' },

  bubbleAI: { maxWidth:'85%', background:'rgba(0,0,0,0.04)', padding:'12px 14px', borderRadius:12, border:'1px solid rgba(0,0,0,0.08)', margin:'8px 0', fontWeight: 600, letterSpacing: .1, lineHeight: 1.7, color:'#111' },
  bubbleUser: { maxWidth:'85%', background:'rgba(255,214,0,0.15)', padding:'12px 14px', borderRadius:12, border:'1px solid rgba(255,214,0,0.25)', margin:'8px 0 8px auto', color:'#111' },
  bubbleText: { fontSize: 15, lineHeight: 1.6, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' },

  checklist: { listStyle:'none', paddingLeft:0, margin:'8px 0 12px' },
  checkItem: { padding:'10px 12px', borderRadius:12, background:'rgba(0,0,0,0.03)', marginBottom:8, border:'1px solid rgba(0,0,0,0.08)' },
  checkLabel: { display:'flex', gap:10, alignItems:'center', cursor:'pointer' },
  checkbox: { width:18, height:18, accentColor:'#ffd600' },

  chatWrap: { display:'flex', flexDirection:'column', gap:12 },
  chatStream: { background:'#fafafa', border:'1px solid rgba(0,0,0,0.08)', borderRadius:18, padding:16, minHeight:380, maxHeight:540, overflowY:'auto', boxShadow:'0 6px 22px rgba(0,0,0,0.08)' },
  chatInputRow: { display:'flex', gap:10, alignItems:'center' },
  chatInput: { flex:1, padding:'12px 14px', borderRadius:12, border:'1px solid rgba(0,0,0,0.15)', background:'#fff', color:'#111', outline:'none' },

  lastWish: { marginTop:12, padding:12, border:'1px dashed rgba(0,0,0,0.18)', borderRadius:12, background:'rgba(255,214,0,0.05)' },
}

/* =========================
   Tiny utils
   ========================= */
function emojiFor(v) { if (v === 'BOLD') return '🔥'; if (v === 'CALM') return '🙏'; if (v === 'RICH') return '💰'; return '✨' }
function titleCase(s){ return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : '' }

/* =========================
   Checklist generation
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
    has(w, ['video','short','reel','tiktok','yt','youtube','clip']) ? 'video' :
    has(w, ['email','newsletter','aweber','list','broadcast']) ? 'email' :
    has(w, ['ad','ads','meta','facebook','google','tiktok ads','campaign']) ? 'ads' :
    has(w, ['landing','page','funnel','vsl','quiz','bridge','optin','thank you','preframe']) ? 'landing' :
    has(w, ['blog','seo','rank','article','post']) ? 'seo' :
    has(w, ['post','tweet','x.com','thread','instagram','ig','story']) ? 'social' :
    has(w, ['meditation','audio','track','hypnosis','bundle']) ? 'product' : 'generic'

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
    case 'product': step3 = `Update the product page for “${W}” : 3 bullets + hero image + buy link. Publish.`; break
  }

  return [
    { id: 's1', text: step1, done: false },
    { id: 's2', text: step2, done: false },
    { id: 's3', text: step3, done: false },
  ]
}
