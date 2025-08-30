// pages/chat-genie.js
// Manifestation Genie — full chat UI + embedded Daily Portal (no extra files)
// - Uses /api/chat (from our earlier file) and src/genieBrain.js (genieIntro)
// - After the first Genie reply each day, shows Shockcard → Ritual Seal → Exercise → Proof
// - One exercise per day, unlocks at 5:00 AM local

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'
import { genieIntro } from '../src/genieBrain'
import dynamic from 'next/dynamic'

// client-only, because it uses localStorage
const GenieDailyPortal = dynamic(() => import('../components/GenieDailyPortal'), { ssr: false })

// =====================
// Basic UI tokens
// =====================
const UI = {
  ink: '#0f172a',
  sub: '#475569',
  muted: '#64748b',
  line: '#e5e7eb',
  brand: '#6633cc',
  brandDk: '#4f27a3',
  gold: '#f59e0b',
  wash: '#ffffff',
  glow: 'rgba(167,139,250,.35)',
  radius: 16
}

// =====================
// Chat helpers
// =====================
function ScrollAnchor() {
  const ref = useRef(null)
  useEffect(() => { ref.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) })
  return <div ref={ref} />
}

function ChatBubble({ role, text }) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      <div style={{
        maxWidth: 680, whiteSpace: 'pre-wrap', lineHeight: 1.35,
        background: isUser ? '#f7f7fb' : '#ffffff',
        border: `1px solid ${UI.line}`, borderRadius: 14, padding: '10px 12px',
        color: UI.ink, boxShadow: isUser ? 'none' : `0 10px 28px ${UI.glow}`
      }}>
        {text}
      </div>
    </div>
  )
}

// ===================================================================================
// DAILY PORTAL — embedded component (Shockcard (2) + Ritual Button (3) + Proof Ticker (6))
// ===================================================================================
const DAILY_UNLOCK_HOUR = 5 // 5:00 local

function todayKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const dd = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${dd}`
}
function nextUnlockDate() {
  const now = new Date()
  const unlock = new Date(now.getFullYear(), now.getMonth(), now.getDate(), DAILY_UNLOCK_HOUR, 0, 0, 0)
  if (now >= unlock) unlock.setDate(unlock.getDate() + 1)
  return unlock
}
function timeUntilUnlockStr() {
  const n = new Date(); const u = nextUnlockDate(); const ms = u - n
  const h = Math.floor(ms / 3_600_000); const m = Math.floor((ms % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}
function useProofCounter(initialSeed = 12000) {
  const [count, setCount] = useState(() => {
    if (typeof window === 'undefined') return initialSeed
    const saved = localStorage.getItem('genie_proof_total')
    if (saved) return parseInt(saved, 10)
    const seed = initialSeed + Math.floor(Math.random() * 200)
    localStorage.setItem('genie_proof_total', String(seed))
    return seed
  })
  const bump = (n = 1) => setCount(c => {
    const v = c + n
    if (typeof window !== 'undefined') localStorage.setItem('genie_proof_total', String(v))
    return v
  })
  return { count, bump }
}

const SHOCKCARDS = [
  { id: '1111', title: '11:11 — Alignment Portal', mantra: 'I am precisely on time.' },
  { id: '777', title: '777 — Fortunate Flow', mantra: 'I am the probability of prosperity.' },
  { id: '888', title: '888 — Infinite Yield', mantra: 'Money multiplies while I breathe.' }
]
function Shockcard({ code = '1111', onContinue }) {
  const cfg = SHOCKCARDS.find(s => s.id === code) || SHOCKCARDS[0]
  return (
    <div style={{
      border: `1px solid ${UI.line}`, borderRadius: UI.radius, padding: 18, background: UI.wash,
      boxShadow: `0 18px 50px ${UI.glow}`, textAlign: 'center', marginBottom: 12
    }}>
      <div style={{ fontWeight: 800, fontSize: 18, color: UI.ink, marginBottom: 8 }}>✨ {cfg.title}</div>
      <div style={{ color: UI.sub, fontSize: 14, marginBottom: 12 }}>Stare 7 seconds. Whisper the mantra once.</div>
      <div style={{ position: 'relative', height: 180, margin: '0 auto 14px', maxWidth: 360 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 9999,
          background: `conic-gradient(from 0deg, ${UI.brand}, ${UI.gold}, ${UI.brand})`,
          filter: 'blur(18px)', opacity: .35, animation: 'spin 7s linear infinite'
        }} />
        <div style={{
          position: 'absolute', inset: 20, borderRadius: 9999,
          border: `2px dashed ${UI.brandDk}`, animation: 'pulse 2.5s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: UI.ink, fontWeight: 900, fontSize: 56, letterSpacing: 2
        }}>{cfg.id}</div>
      </div>
      <div style={{ color: UI.ink, fontWeight: 700, marginBottom: 10 }}>“{cfg.mantra}”</div>
      <button onClick={onContinue} style={btnPrimary()}>I felt it — continue</button>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(102,51,204,.35) }
          70% { box-shadow: 0 0 0 24px rgba(102,51,204,0) }
          100% { box-shadow: 0 0 0 0 rgba(102,51,204,0) }
        }
      `}</style>
    </div>
  )
}

function RitualSeal({ onSealed }) {
  const [glitch, setGlitch] = useState(false)
  const click = () => {
    setGlitch(true)
    setTimeout(() => { setGlitch(false); onSealed?.() }, 1100)
  }
  return (
    <div style={{
      border: `1px solid ${UI.line}`, borderRadius: UI.radius, padding: 18, background: UI.wash,
      boxShadow: `0 18px 50px ${UI.glow}`, textAlign: 'center', marginBottom: 12
    }}>
      <div style={{ fontWeight: 800, fontSize: 18, color: UI.ink, marginBottom: 8 }}>Break the Loop</div>
      <div style={{ color: UI.sub, fontSize: 14, marginBottom: 14 }}>
        Click to crack the old pattern. Screen will pulse — that’s your seal.
      </div>
      <button onClick={click} className={glitch ? 'glx' : ''} style={btnPrimary({ fontSize: 16 })}>
        {glitch ? 'Sealing…' : 'Seal Today’s Shift'}
      </button>
      <style>{`
        .glx { position: relative; overflow: hidden; }
        .glx::before, .glx::after {
          content: ""; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, ${UI.gold}, transparent);
          animation: sweep .9s ease forwards; mix-blend-mode: overlay; opacity: .8;
        }
        .glx::after { animation-delay: .15s }
        @keyframes sweep { 0% { transform: translateX(-120%) } 100% { transform: translateX(120%) } }
      `}</style>
    </div>
  )
}

// ---- Exercise Library (condensed; mapped to 5 ologies; each with check-in)
const EXERCISES = [
  { id:'O-1', cat:'O', title:'Identity Switch (90s)', steps:[
    'Say out loud: “I am the one money trusts.”',
    'Stand tall: shoulders back; inhale 4, exhale 6 (x3).',
    'Send ONE message that could bring money today.'
  ], check:'What changed in your posture/energy (1 word)?' },
  { id:'P-1', cat:'P', title:'Pattern Interrupt (60s)', steps:[
    "When worry spikes: say 'Stop. Not mine.'",
    'Breath 4/6 once.',
    'Tap wrist 7x: “I am safe to receive.”'
  ], check:'Intensity drop % (0–100)?' },
  { id:'N-1', cat:'N', title:'7-Breath Reset (90s)', steps:[
    'Inhale 4 / hold 4 / exhale 6 — 7 rounds.',
    'On each exhale: “Money flows when I breathe.”'
  ], check:'Calm level now (1–10)?' },
  { id:'Ph-1', cat:'Ph', title:'Somatic Yes (2m)', steps:[
    'Recall a real win; find the body-spot that lights up.',
    "Rub that spot and say: 'Do it again.'"
  ], check:'Where in your body turned on?' },
  { id:'C-1', cat:'C', title:'11:11 Pause (30s when seen)', steps:[
    'When repeating numbers appear: palm on heart:',
    "Say: 'I am in flow. Continue.'"
  ], check:'Which number showed up first?' },
  // ... (you can paste the full 30-set here later; these 5 are enough to demo rotation)
]
const ROTATION = ['O','P','N','Ph','C']
function pickByCat(list){ const pool = EXERCISES.filter(e=>list.includes(e.cat)); return pool[Math.floor(Math.random()*pool.length)] }
function selectTodaysExercise(lastCat, lastShiftScore){
  if (typeof lastShiftScore==='number' && lastShiftScore<7) return pickByCat(['P','N'])
  let idx = lastCat ? ROTATION.indexOf(lastCat) : -1
  idx = (idx + 1) % ROTATION.length
  return pickByCat([ROTATION[idx]])
}

function ExerciseCard({ exercise, onComplete }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [checkin, setCheckin] = useState('')
  const [shift, setShift] = useState(8)
  const total = exercise.steps.length
  const next = () => setStepIdx(i => Math.min(i + 1, total))
  const prev = () => setStepIdx(i => Math.max(i - 1, 0))
  const submit = () => { if (!checkin.trim()) return; onComplete?.({ checkin, shift: Number(shift) }) }

  return (
    <div style={{
      border: `1px solid ${UI.line}`, borderRadius: UI.radius, padding: 18, background: UI.wash,
      boxShadow: `0 18px 50px ${UI.glow}`
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: UI.ink }}>{exercise.title}</div>
        <div style={{ fontSize: 12, color: UI.muted }}>{Math.min(stepIdx+1, total+1)}/{total+1}</div>
      </div>
      {stepIdx < total ? (
        <>
          <p style={{ color: UI.sub, fontSize: 14, marginBottom: 12 }}>{exercise.steps[stepIdx]}</p>
          <div style={{ display:'flex', gap:10 }}>
            {stepIdx>0 && <button onClick={prev} style={btnGhost()}>Back</button>}
            <button onClick={next} style={btnPrimary()}>{stepIdx===total-1 ? 'I did it' : 'Next step'}</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ color: UI.ink, fontWeight: 700, marginBottom: 8 }}>Seal your proof.</div>
          <label style={{ display:'block', fontSize:14, color: UI.sub, marginBottom:6 }}>{exercise.check}</label>
          <textarea value={checkin} onChange={e=>setCheckin(e.target.value)} rows={3} placeholder="Type your 1-line check-in…"
            style={{ width:'100%', border:`1px solid ${UI.line}`, borderRadius:12, padding:10, outline:'none',
                     fontFamily:'inherit', fontSize:14, color:UI.ink, marginBottom:10 }} />
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <label style={{ fontSize:13, color:UI.muted }}>Felt shift (1–10):</label>
            <input type="number" min={1} max={10} value={shift}
              onChange={e=>setShift(e.target.value)}
              style={{ width:64, border:`1px solid ${UI.line}`, borderRadius:10, padding:'6px 8px', fontSize:14 }} />
          </div>
          <button onClick={submit} style={btnPrimary({ width:'100%' })}>Submit proof & finish</button>
        </>
      )}
    </div>
  )
}

function GenieDailyPortalInline({ userName='Friend', dream='$1K/day', initialProof=12000 }) {
  const { count, bump } = useProofCounter(initialProof)
  const tKey = todayKey()
  const [record, setRecord] = useState(() => {
    if (typeof window==='undefined') return null
    const raw = localStorage.getItem('genie_daily_'+tKey)
    return raw ? JSON.parse(raw) : null
  })
  const lastMeta = useMemo(() => {
    if (typeof window==='undefined') return {}
    const raw = localStorage.getItem('genie_daily_lastmeta')
    return raw ? JSON.parse(raw) : {}
  }, [])
  const completedToday = !!record?.done
  const [exercise] = useState(() => {
    if (record?.exerciseId) return EXERCISES.find(e=>e.id===record.exerciseId) || selectTodaysExercise(lastMeta.cat, lastMeta.shift)
    return selectTodaysExercise(lastMeta.cat, lastMeta.shift)
  })
  const shock = useMemo(() => ['1111','777','888'][Math.floor(Math.random()*3)], [tKey])
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (typeof window==='undefined') return
    if (!record) {
      const seed = { exerciseId: exercise.id, done:false, step:0 }
      localStorage.setItem('genie_daily_'+tKey, JSON.stringify(seed))
      setRecord(seed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tKey])

  const persist = (patch) => {
    if (typeof window==='undefined') return
    const current = JSON.parse(localStorage.getItem('genie_daily_'+tKey) || '{}')
    const merged = { ...current, ...patch }
    localStorage.setItem('genie_daily_'+tKey, JSON.stringify(merged))
    setRecord(merged)
  }
  const proceed = () => { const n = Math.min(step+1, 2); setStep(n); persist({ step:n }) }
  const finish = ({ checkin, shift }) => {
    persist({ done:true, checkin, shift, finishedAt: new Date().toISOString() })
    if (typeof window!=='undefined') localStorage.setItem('genie_daily_lastmeta', JSON.stringify({ cat: exercise.cat, shift }))
    bump(1)
  }

  return (
    <div style={{ marginTop: 10 }}>
      {/* Header + Proof Ticker */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'10px 14px', border:`1px solid ${UI.line}`, borderRadius:UI.radius,
        background:UI.wash, marginBottom: 14, boxShadow:`0 10px 30px ${UI.glow}`
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:12, background:`linear-gradient(45deg, ${UI.brand}, ${UI.gold})` }} />
          <div>
            <div style={{ fontWeight:900, fontSize:15 }}>Manifestation Genie</div>
            <div style={{ fontSize:12, color: UI.muted }}>Hi {userName}. Today’s portal for <b>{dream}</b> is open.</div>
          </div>
        </div>
        <div style={{
          fontWeight:800, fontSize:14, color:UI.ink, border:`1px solid ${UI.line}`,
          borderRadius:12, padding:'6px 10px', background:'#fff'
        }}>
          ✨ Wishes granted today: <span className="ticker">{count.toLocaleString()}</span>
        </div>
      </div>

      {!completedToday ? (
        <>
          {step===0 && <Shockcard code={shock} onContinue={proceed} />}
          {step===1 && <RitualSeal onSealed={proceed} />}
          {step===2 && <ExerciseCard exercise={exercise} onComplete={finish} />}
        </>
      ) : (
        <div style={{
          border:`1px solid ${UI.line}`, borderRadius:UI.radius, padding:18, background:UI.wash,
          boxShadow:`0 18px 50px ${UI.glow}`
        }}>
          <div style={{ fontWeight:900, fontSize:18, marginBottom:8 }}>Portal complete.</div>
          <div style={{ color: UI.sub, fontSize:14, marginBottom:10 }}>
            Your shift is sealed. <b>Next unlock at 5:00 AM</b> ({timeUntilUnlockStr()}).
          </div>
          <div style={{ fontSize:13, color:UI.muted, marginBottom:2 }}>
            Today: {exercise.id} • Category {exercise.cat} • Felt shift {record?.shift ?? '—'}/10
          </div>
          {record?.checkin && (
            <div style={{ marginTop:10, padding:12, border:`1px dashed ${UI.line}`, borderRadius:12, background:'#fff' }}>
              <div style={{ fontWeight:800, fontSize:13, marginBottom:6 }}>Your proof</div>
              <div style={{ fontSize:14, color:UI.ink }}>{record.checkin}</div>
            </div>
          )}
          <div style={{ marginTop:12 }}>
            <button onClick={()=>alert('See you at dawn. Keep your eyes open for 11:11 today.')} style={btnGhost({ fontWeight:800 })}>
              Cosmic reminder set
            </button>
          </div>
        </div>
      )}

      <div style={{ textAlign:'center', marginTop:14, color:UI.muted, fontSize:12 }}>
        One exercise. One seal. One shift. Return tomorrow at <b>5:00 AM</b>.
      </div>
    </div>
  )
}

// =====================
// Buttons
// =====================
function btnPrimary(extra={}) {
  return {
    background: `linear-gradient(90deg, ${UI.brand}, ${UI.gold})`,
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '10px 14px',
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
    boxShadow: `0 10px 28px ${UI.glow}`,
    ...extra
  }
}
function btnGhost(extra={}) {
  return {
    background: '#fff',
    color: UI.ink,
    border: `1px solid ${UI.line}`,
    borderRadius: 12,
    padding: '10px 14px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    ...extra
  }
}

// =====================
// MAIN PAGE
// =====================
export default function ChatGeniePage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPortal, setShowPortal] = useState(false) // reveal after first genie reply
  const inputRef = useRef(null)

  // Intro on mount
  useEffect(() => {
    (async () => {
      const pack = await genieIntro({ user: { firstName: 'Friend' } })
      const introBubbles = (pack?.bubbles || []).map(b => ({ role:'assistant', content:b }))
      setMessages(introBubbles)
    })()
  }, [])

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = { role:'user', content: input.trim() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ messages })
      })
      const data = await res.json()
      const bubbles = Array.isArray(data?.bubbles) && data.bubbles.length
        ? data.bubbles
        : [data?.text || data?.reply || 'The lamp flickered. Try again with one clear wish.']
      const newMsgs = bubbles.map(t => ({ role:'assistant', content: t }))
      setMessages(m => [...m, ...newMsgs])
      // Reveal the daily portal after the first ritual reply of the day
      if (!showPortal) setShowPortal(true)
    } catch (e) {
      setMessages(m => [...m, { role:'assistant', content:'The wind swallowed my words. Try once more.' }])
    } finally {
      setLoading(false)
      setTimeout(()=>inputRef.current?.focus(), 50)
    }
  }

  function onKey(e){ if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <>
      <Head><title>Manifestation Genie — Chat</title></Head>

      <div style={{ minHeight:'100vh', background:'#f8fafc', padding:'20px 14px' }}>
        <div style={{ maxWidth:980, margin:'0 auto' }}>
          <header style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'10px 14px', background:'#fff', border:`1px solid ${UI.line}`,
            borderRadius:16, boxShadow:`0 10px 30px ${UI.glow}`, marginBottom:14
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:12, background:`linear-gradient(45deg, ${UI.brand}, ${UI.gold})` }} />
              <div>
                <div style={{ fontWeight:900, fontSize:16 }}>Manifestation Genie</div>
                <div style={{ fontSize:12, color:UI.muted }}>Speak your wish… ✨</div>
              </div>
            </div>
            <button onClick={()=>window.location.reload()} style={btnGhost({ fontWeight:800 })}>New wish</button>
          </header>

          {/* Chat window */}
          <div style={{
            background:'#fff', border:`1px solid ${UI.line}`, borderRadius:16,
            padding:14, minHeight:380, boxShadow:`0 18px 50px ${UI.glow}`
          }}>
            {messages.map((m, i) => <ChatBubble key={i} role={m.role==='assistant'?'assistant':'user'} text={m.content} />)}

            {/* Daily Portal injected after first genie reply */}
            {showPortal && (
              <div style={{ margin: '12px 0' }}>
                <GenieDailyPortalInline userName="Friend" dream="your wish" initialProof={15234} />
              </div>
            )}

            <ScrollAnchor />
          </div>

          {/* Input */}
          <div style={{ display:'flex', gap:10, marginTop:12 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Tell me what’s on your mind — one word is enough, or drop the whole story."
              rows={2}
              style={{
                flex:1, border:`1px solid ${UI.line}`, borderRadius:12, padding:'10px 12px',
                fontFamily:'inherit', fontSize:14, outline:'none', background:'#fff', color: UI.ink
              }}
            />
            <button onClick={send} disabled={loading} style={btnPrimary({ width:120 })}>
              {loading ? 'Sending…' : 'Send'}
            </button>
          </div>

          <footer style={{ textAlign:'center', color:UI.muted, fontSize:12, marginTop:10 }}>
            © {new Date().getFullYear()} Manifestation Genie. Powered by HypnoticMeditations.ai
          </footer>
        </div>
      </div>
    </>
  )
}
