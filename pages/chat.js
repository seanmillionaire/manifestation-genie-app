// pages/chat.js — Manifestation Genie
// Flow: welcome → vibe → resumeNew → questionnaire → chat
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
  vibePrompt: "Choose your vibe: 🔥 Bold, 🙏 Calm, 💰 Rich. Which vibe shall we ride?",
  resumeOrNew: "Shall we continue with your last wish, or spark a fresh one?",
  resumeLabel: "Continue last wish",
  newLabel: "Start a new wish",
  questPrompts: {
    wish: "Whisper your wish into the lamp… what do you want to call in?",
    block: "Tell me the stone in your shoe — what’s slowing your step?",
    micro: "Name one tiny move you’ll take in the next 24 hours. One pebble starts the ripple."
  },
  rewards: [
    "Ahhh — that’s the golden key I was waiting for. Doors are opening…",
    "Yes! That’s the spark. Watch how the lamp glows brighter now.",
    "You just cracked a code most never see. That’s rare magic.",
    "The stars nodded when you said that. Alignment confirmed."
  ],
  closing: "The lamp dims… but the magic stays with you.",
  tinyCTA: "Do we spark a new wish or walk the path we opened?"
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
        <h3 style={styles.h3}>What is your #1 wish for today, {firstName}?</h3>
        <p style={styles.subtle}>{GenieLang.questPrompts.wish}</p>
        <textarea
          value={wish}
          onChange={e=>setWish(e.target.value)}
          placeholder="Type it here, and let me know the details."
          style={styles.textarea}
          rows={3}
        />
        <p style={{...styles.subtle, marginTop:16}}>{GenieLang.questPrompts.block}</p>
        <textarea
          value={block}
          onChange={e=>setBlock(e.target.value)}
          placeholder="Name the snag. No drama, just truth."
          style={styles.textarea}
          rows={2}
        />
        <p style={{...styles.subtle, marginTop:16}}>{GenieLang.questPrompts.micro}</p>
        <input
          value={micro}
          onChange={e=>setMicro(e.target.value)}
          placeholder="e.g., Send the email / 10-minute brainstorm / Outline offer"
          style={styles.input}
        />

        <button
          style={{...styles.btn, marginTop:16, opacity: canSubmit ? 1 : 0.6, cursor: canSubmit ? 'pointer' : 'not-allowed'}}
          disabled={!canSubmit}
          onClick={() => onComplete({wish:wish.trim(), block:block.trim(), micro:micro.trim(), vibe, date: todayStr()})}
        >
          Grant this step →
        </button>
        <p style={{...styles.mini, marginTop:12}}>{pick(GenieLang.rewards)}</p>
      </div>
    </>
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

  // phases: welcome → vibe → resumeNew → questionnaire → chat
  const [phase, setPhase] = useState('welcome')
  const [vibe, setVibe] = useState(null) // 'BOLD' | 'CALM' | 'RICH'
  const [currentWish, setCurrentWish] = useState(null) // {wish, block, micro, vibe, date}
  const [lastWish, setLastWish] = useState(null)

  // greeting seeded with name
  const [greeting] = useState(() => injectName(pick(GenieLang.greetings), firstName))
  const [thread, setThread] = useState([{ role:'assistant', content: greeting }])

  // 🔐 Ultra-safe Supabase name hydration (won’t crash)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (!alive || !user) return

        let fn = null

        // 1) profiles.full_name (best source)
        try {
          const { data: p } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle()
          if (p?.full_name) fn = String(p.full_name).trim().split(' ')[0]
        } catch (e) {
          // non-fatal (RLS or table missing in this env)
          // console.warn('profiles lookup', e)
        }

        // 2) auth metadata fallbacks
        if (!fn) {
          const meta = user.user_metadata || {}
          fn =
            (meta.full_name?.trim().split(' ')[0]) ||
            (meta.name?.trim().split(' ')[0]) ||
            meta.given_name ||
            null
        }

        // 3) email local part
        if (!fn) fn = (user.email || '').split('@')[0] || 'Friend'

        if (alive) {
          setFirstName(fn)
          try { localStorage.setItem(NAME_KEY, fn) } catch {}
        }
      } catch (e) {
        // keep running with cached/fallback name
        // console.warn('name hydrate failed', e)
      }
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
      setThread(s.thread?.length ? s.thread : [{role:'assistant', content: injectName(pick(GenieLang.greetings), firstName)}])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist state
  useEffect(()=>{ saveState({ phase, vibe, currentWish, lastWish, thread }) }, [phase, vibe, currentWish, lastWish, thread])

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
      setPhase('questionnaire')
      setThread(prev => prev.concat({
        role:'assistant',
        content: `We’ll keep weaving the last wish: <b>${escapeHTML(chosen.wish)}</b>. Add a fresh micro-move to heat the lamp, then we chat.`
      }))
    } else {
      setPhase('questionnaire')
      setThread(prev => prev.concat({ role:'assistant', content: "No past wish found. Let’s light a new one." }))
    }
  }

  const handleNew = () => {
    setCurrentWish(null)
    setPhase('questionnaire')
    setThread(prev => prev.concat({ role:'assistant', content: "New star, new path. I’m listening…" }))
  }

  const handleQuestComplete = (data) => {
    setCurrentWish(data)
    setLastWish(data)
    setPhase('chat')
    setThread(prev => prev.concat(
      { role:'assistant', content: `Wish set: <b>${escapeHTML(data.wish)}</b>.` },
      { role:'assistant', content: pick(GenieLang.rewards) },
      { role:'assistant', content: `Speak, and I’ll shape the path, ${firstName}. ${GenieLang.tinyCTA}` }
    ))
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
    setThread([{ role:'assistant', content: injectName(pick(GenieLang.greetings), firstName) }])
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.container}>
        {/* Welcome */}
        {phase === 'welcome' && (
          <div style={styles.card}>
            <h1 style={{fontSize:32, fontWeight:900, margin:0}}>Your Personal AI Genie ✨</h1>
            <p style={{fontSize:18, opacity:.9, marginTop:8}}>
              This is your daily portal to manifest your dreams into reality.
            </p>
            <p style={styles.lead}>{injectName(pick(GenieLang.greetings), firstName)}</p>
            <button style={styles.btn} onClick={()=>setPhase('vibe')}>Rub the lamp & begin 🔮</button>
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
  const wishLine = currentWish?.wish ? `Your star is <b>${escapeHTML(currentWish.wish)}</b>. ` : ''
  return `${vibeLine}I hear you. ${wishLine}You’re rubbing the right side of the lamp now. 
  Here’s the path that shimmers: take your tiny move (“<i>${escapeHTML(currentWish?.micro || 'one small step')}</i>”) in the next hour. 
  Then return and say: <b>“Genie, the pebble is in the pond.”</b> I’ll open the next door. ✨`
}

/* =========================
   Styles (inline for portability)
   ========================= */
const styles = {
  portalHeader: { textAlign:'left', marginBottom:16 },
  portalTitle: { fontSize:32, fontWeight:900, margin:0, color:'#ffd600', letterSpacing:.2 },
  portalSubtitle: { fontSize:18, opacity:.9, marginTop:6 },

  wrap: { minHeight:'100vh', background:'#0b0b12', color:'#eee', padding:'24px' },
  container: { maxWidth: 820, margin:'0 auto' },
  card: { background:'#11121a', border:'1px solid #222433', borderRadius:16, padding:24, boxShadow:'0 10px 30px rgba(0,0,0,.35)' },
  h2: { margin:0, fontSize:28, fontWeight:900, letterSpacing:.3 },
  h3: { marginTop:0, fontSize:20, fontWeight:800 },
  lead: { fontSize:18, opacity:.95, lineHeight:1.4 },
  subtle: { fontSize:15, opacity:.85, lineHeight:1.4 },
  mini: { fontSize:13, opacity:.8 },
  row: { display:'flex', gap:12, marginTop:12, flexWrap:'wrap' },
  vibeRow: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginTop:12 },
  vibeBtn: { padding:'14px 16px', borderRadius:12, border:'1px solid #292b3a', background:'#0f1017', color:'#fff', cursor:'pointer', textAlign:'center', boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.02)' },
  input: { width:'100%', padding:'12px 14px', borderRadius:10, border:'1px solid #2a2d3b', background:'#0f1017', color:'#fff', outline:'none' },
  textarea: { width:'100%', padding:'12px 14px', borderRadius:10, border:'1px solid #2a2d3b', background:'#0f1017', color:'#fff', outline:'none', resize:'vertical' },
  btn: { padding:'12px 16px', borderRadius:12, border:'2px solid #ffd600', background:'#111', color:'#ffd600', fontWeight:900, cursor:'pointer', letterSpacing:.2 },
  btnGhost: { padding:'12px 16px', borderRadius:12, border:'1px solid #3a3c4d', background:'transparent', color:'#ddd', fontWeight:800, cursor:'pointer' },
  lastWish: { marginTop:12, padding:12, border:'1px dashed #34374a', borderRadius:12, background:'#0d0f17' },

  chatWrap: { display:'flex', flexDirection:'column', gap:12 },
  chatStream: { background:'#0f1119', border:'1px solid #222433', borderRadius:16, padding:16, minHeight:360, maxHeight:520, overflowY:'auto' },
  bubbleAI: { maxWidth:'85%', background:'#121422', padding:'12px 14px', borderRadius:12, border:'1px solid #2a2d3b', margin:'8px 0' },
  bubbleUser: { maxWidth:'85%', background:'#0a0c14', padding:'12px 14px', borderRadius:12, border:'1px solid #2a2d3b', margin:'8px 0 8px auto' },
  bubbleText: { fontSize:15, lineHeight:1.6 },
  chatInputRow: { display:'flex', gap:10, alignItems:'center' },
  chatInput: { flex:1, padding:'12px 14px', borderRadius:10, border:'1px solid #2a2d3b', background:'#0f1017', color:'#fff', outline:'none' },
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
