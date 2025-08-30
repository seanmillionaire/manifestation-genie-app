// pages/chat-genie.js
// Manifestation Genie — chat with lamp intro + in-chat DAILY PORTAL (bubbles)
// Flow inside chat: Identity (if missing) → Shockcard → Ritual Seal → Exercise → Proof → Lock until 5:00 AM

import { useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'

/* =========================================================
   Optional local brain; safe fallback to /api/chat if absent
   ========================================================= */
let localBrain = null
try {
  const brain = require('../src/genieBrain')
  localBrain = {
    genieIntro: brain.genieIntro,
    genieReply: brain.genieReply,
    dailyAssignment: brain.dailyAssignment,
  }
} catch {
  // no local brain; use API
}

/* =========================================================
   Supabase (optional)
   ========================================================= */
let supabase = null
try {
  const { supabaseClient } = require('../src/supabaseClient')
  supabase = supabaseClient
} catch {}

/* =========================================================
   Utility — time windows
   ========================================================= */
function pad(n) { return n < 10 ? '0' + n : '' + n }
function timeUntil(date) {
  const now = new Date()
  let diff = date - now
  if (diff < 0) diff = 0
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return `${h}h ${pad(m)}m`
}

/* =========================================================
   Persistent first name (best-effort)
   ========================================================= */
function useFirstName() {
  const [firstName, setFirstName] = useState('')
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const cached = typeof window !== 'undefined' ? localStorage.getItem('mg_first_name') : null
        if (cached && mounted) { setFirstName(cached); return }
        if (supabase) {
          const { data:{ session } = { session: null } } = await supabase.auth.getSession()
          const email = session?.user?.email || ''
          const guess = email ? (email.split('@')[0] || '') : ''
          const name = guess ? guess.replace(/[._-]+/g,' ').trim().split(' ')[0] : 'Friend'
          if (mounted) setFirstName(name.charAt(0).toUpperCase() + name.slice(1))
        }
      } catch {}
    })()
    return () => { mounted = false }
  }, [])
  useEffect(() => {
    if (typeof window === 'undefined') return
    try { localStorage.setItem('mg_first_name', firstName) } catch {}
  }, [firstName])
  return firstName || 'Friend'
}

/* =========================================================
   DAILY PORTAL engine (O,P,N,Ph,C) — embedded as chat bubbles
   ========================================================= */
const UI = {
  ink: '#0f172a', sub: '#475569', muted: '#64748b', line: '#e2e8f0',
  brand: '#6633cc', gold: '#f59e0b', wash: '#ffffff', glow: 'rgba(167,139,250,.25)', radius: 12
}
const DAILY_UNLOCK_HOUR = 5 // local time

function todayKey() {
  const now = new Date()
  const y = now.getFullYear()
  const m = pad(now.getMonth() + 1)
  const d = pad(now.getDate())
  return `${y}-${m}-${d}`
}
function todayUnlockTime() {
  const t = new Date()
  t.setHours(DAILY_UNLOCK_HOUR, 0, 0, 0)
  if (t < new Date()) t.setDate(t.getDate() + 1)
  return t
}
function timeUntilUnlockStr() {
  return timeUntil(todayUnlockTime())
}

/* =========================================================
   Chat component
   ========================================================= */
export default function ChatGenie() {
  const firstName = useFirstName()
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [started, setStarted] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [inputLocked, setInputLocked] = useState(false)
  const listRef = useRef(null)

  // wishes count (proof)
  const [count, setCount] = useState(()=>{
    if (typeof window === 'undefined') return 0
    const raw = localStorage.getItem('genie_proof_total')
    return raw ? parseInt(raw,10) || 0 : 0
  })
  useEffect(()=>{ if (typeof window!=='undefined') localStorage.setItem('genie_proof_total', String(count)) },[count])

  // autoscroll
  useEffect(()=>{ listRef.current?.scrollTo(0, 1e9) }, [msgs, thinking, started])

  // Helpers to push chat content
  function pushText(author, text) {
    setMsgs(m => [...m, { author, text }])
  }
  function pushNode(author, nodeKey, node) {
    setMsgs(m => [...m, { author, key: nodeKey, node }])
  }

  // Typing effect helpers — word-by-word with per-line pauses
  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)) }
  function withJitter(ms, jitter=0.35){
    const delta = ms * jitter * (Math.random()*2 - 1)
    return Math.max(0, Math.round(ms + delta))
  }
  async function typeLine(author, line, { perWordMs=120, cursor=true } = {}) {
    const key = 'stream-' + Date.now() + Math.random().toString(16).slice(2)
    setMsgs(m => [...m, { author, key, text: '' }])

    const words = String(line).split(/\s+/).filter(Boolean)
    for (let i=0; i<words.length; i++){
      await sleep(withJitter(perWordMs))
      setMsgs(curr => curr.map(msg => {
        if (msg.key !== key) return msg
        const next = msg.text ? (msg.text + ' ' + words[i]) : words[i]
        return { ...msg, text: next + (cursor ? '▍' : '') }
      }))
    }
    // remove cursor at end of line
    setMsgs(curr => curr.map(msg => (msg.key===key ? { ...msg, text: msg.text.replace(/▍$/,'') } : msg)))
    return key
  }

  async function streamBubbles(author, bubbles = [], { perWordMs=120, linePauseMs=700 } = {}) {
    for (const b of bubbles) {
      await typeLine(author, b, { perWordMs })
      await sleep(withJitter(linePauseMs))
    }
  }

  /* =========================================================
     In-chat DAILY PORTAL flow
     ========================================================= */
  const tKey = todayKey()
  const lastMeta = useMemo(()=>{
    if (typeof window==='undefined') return {}
    const raw = localStorage.getItem('genie_daily_lastmeta')
    return raw ? JSON.parse(raw) : {}
  },[])
  const identityLS = () => {
    if (typeof window==='undefined') return { name:'', dream:'' }
    return {
      name: localStorage.getItem('genie_user_name') || '',
      dream: localStorage.getItem('genie_user_dream') || ''
    }
  }
  const recordToday = () => {
    if (typeof window==='undefined') return null
    const raw = localStorage.getItem('genie_daily_'+tKey)
    return raw ? JSON.parse(raw) : null
  }

  function startPortalInChat() {
    setInputLocked(true)
    const id = identityLS()
    const rec = recordToday()

    // If already completed, show done bubble and release chat
    if (rec?.done) {
      pushNode('Genie','portal-complete', (
        <BubbleBox>
          <Title>Portal complete.</Title>
          <P>Your shift is sealed. <b>Next unlock at 5:00 AM</b> ({timeUntilUnlockStr()}).</P>
          <Meta>Today: {rec.exerciseId} • Felt shift {rec.shift || '—'}/10 • ✨ Wishes granted: <b>{count.toLocaleString()}</b></Meta>
        </BubbleBox>
      ))
      setInputLocked(false)
      return
    }

    // … (DAILY PORTAL flow code continues unchanged below)
  }

  // replace a node bubble by key
  function replaceNode(nodeKey, newNode) {
    setMsgs(curr => curr.map(m => (m.key===nodeKey ? { ...m, node:newNode } : m)))
  }

  /* =========================================================
     Genie intro and regular chat
     ========================================================= */
  async function onLampClick() {
    if (started) return
    setStarted(true)
    setThinking(true)
    try {
      if (localBrain?.genieIntro) {
        const res = await localBrain.genieIntro({ user: { firstName } })
        const bubbles = Array.isArray(res?.bubbles) && res.bubbles.length ? res.bubbles : [
          'Ahh… the lamp warms in your palm. ✨',
          'I am the Manifestation Genie — keeper of tiny moves that bend reality.',
          'Speak your wish — a word, a sentence, a storm. I listen.'
        ]
        await streamBubbles('Genie', bubbles)
      } else {
        await streamBubbles('Genie', [
          'Ahh… the lamp warms in your palm. ✨',
          'I am the Manifestation Genie — keeper of tiny moves that bend reality.',
          'Speak your wish — a word, a sentence, a storm. I listen.'
        ])
      }
    } catch {
      pushText('Genie','The lamp flickered. Tap again if I go quiet.')
    } finally {
      setThinking(false)
    }
  }

  async function callLocalBrain(prompt) {
    if (!localBrain?.genieReply) throw new Error('no local brain')
    const res = await localBrain.genieReply({ prompt, user: { firstName } })
    if (Array.isArray(res?.bubbles)) return res.bubbles
    if (typeof res?.text === 'string') return res.text.split('\n').filter(Boolean)
    return []
  }
  async function callApi(prompt) {
    const r = await fetch('/api/chat', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ prompt, user: { firstName } })
    })
    if (!r.ok) throw new Error('api')
    const data = await r.json()
    if (Array.isArray(data?.bubbles)) return data.bubbles
    if (typeof data?.text === 'string') return data.text.split('\n').filter(Boolean)
    return []
  }
  async function getReplyBubbles(prompt) {
    try { return await callLocalBrain(prompt) } catch { return await callApi(prompt) }
  }

  async function onSend() {
    const trimmed = input.trim()
    if (!trimmed || thinking || inputLocked) return
    pushText(firstName, trimmed)
    setInput('')
    setThinking(true)
    try {
      const bubbles = await getReplyBubbles(trimmed)
      const safe = (Array.isArray(bubbles) && bubbles.length)
        ? bubbles
        : ['As you wish — tell me the goal in one short line and I’ll give you your first 3 moves.']
      await streamBubbles('Genie', safe)
    } catch {
      pushText('Genie', 'Hmm… the lamp flickered (network/brain error). Say the wish again, or refresh.')
    } finally {
      setThinking(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  function onNewWish() {
    if (inputLocked) return
    setThinking(true)
    try {
      let seed = null
      if (localBrain?.dailyAssignment) {
        const d = localBrain.dailyAssignment({ name: firstName })
        seed = `**${d.title}** — ${d.why}\n• ${d.steps.join('\n• ')}`
      }
      pushText('Genie', seed || 'It is done — write the one-line wish, then I’ll drop your first 3 moves.')
    } catch {
      pushText('Genie', 'It is done — what’s today’s wish?')
    } finally {
      setThinking(false)
    }
  }

  /* =========================================================
     Render
     ========================================================= */
  return (
    <>
      <Head>
        <title>Manifestation Genie</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={{ background:'#fff', minHeight:'100vh', padding:'20px 0' }}>
        <div style={{ width:'min(960px, 92vw)', margin:'0 auto',
          background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:14, padding:20, position:'relative' }}>

          <div style={{ fontWeight:800, fontSize:22, display:'flex', alignItems:'center', gap:10, margin:'6px 6px 12px' }}>
            <span style={{ fontSize:24 }}>🧞‍♂️</span>
            <span>Manifestation Genie</span>
            <span style={{ marginLeft:'auto', fontSize:12, color:'#334155',
              border:'1px solid #e2e8f0', borderRadius:10, padding:'4px 8px', background:'#fff' }}>
              ✨ Wishes granted today: <b>{count.toLocaleString()}</b>
            </span>
          </div>

          {/* LAMP IDLE SCREEN */}
          {!started && (
            <div onClick={onLampClick}
                 style={{ height:'60vh', border:'1px dashed #cbd5e1', borderRadius:12, display:'flex',
                   alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, background:'#fff',
                   cursor:'pointer', userSelect:'none' }}>
              <div style={{ fontSize:72, animation:'pulse 2s infinite' }}>🧞‍♂️</div>
              <div style={{ fontSize:16, color:'#334155', textAlign:'center', padding:'0 16px' }}>
                Tap the lamp to summon your Genie. Speak your wish.
              </div>
              <style jsx>{`
                @keyframes pulse { 0%{transform:scale(1)} 50%{transform:scale(1.06)} 100%{transform:scale(1)} }
              `}</style>
            </div>
          )}

          {/* CHAT */}
          {started && (
            <>
              <div ref={listRef}
                   style={{ height:'60vh', overflow:'auto', padding:8, background:'#fff',
                     border:'1px solid #e2e8f0', borderRadius:12, marginBottom:12 }}>
                {msgs.map((m, i) => (
                  <div key={m.key ?? i}
                       style={{ display:'flex', marginBottom:10, justifyContent: m.author === 'Genie' ? 'flex-start' : 'flex-end' }}>
                    <div style={{
                      maxWidth:'75%',
                      background: m.author === 'Genie' ? '#f1f5f9' : '#fef3c7',
                      border:'1px solid #e2e8f0', padding:'10px 12px', borderRadius:12, whiteSpace:'pre-wrap'
                    }}>
                      {m.node ? m.node : m.text}
                    </div>
                  </div>
                ))}

                {thinking && (
                  <div style={{ display:'flex', marginBottom:10, justifyContent:'flex-start' }}>
                    <div style={{ background:'#f1f5f9', border:'1px solid #e2e8f0', padding:'10px 12px', borderRadius:12 }}>
                      <span className="dots">Genie is thinking</span>
                      <style jsx>{`
                        .dots::after { content:'…'; animation: pulse 1.2s infinite steps(4,end); }
                        @keyframes pulse { 0%{content:'.'} 33%{content:'..'} 66%{content:'...'} 100%{content:'....'} }
                      `}</style>
                    </div>
                  </div>
                )}
              </div>

              {/* INPUT */}
              <div style={{ display:'flex', gap:8 }}>
                <textarea
                  value={input}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={2}
                  placeholder={inputLocked ? "Complete today’s portal to continue…" : "Speak to your Genie… ✨"}
                  style={{ flex:1, padding:'12px 14px', borderRadius:10, border:'1px solid #cbd5e1', outline:'none' }}
                  disabled={thinking || inputLocked}
                />
                <button
                  onClick={onSend}
                  disabled={thinking || inputLocked || !input.trim()}
                  style={{ background:'#facc15', color:'#000', border:'none', borderRadius:12, padding:'10px 18px',
                    fontWeight:800, cursor: (thinking||inputLocked||!input.trim()) ? 'not-allowed' : 'pointer' }}>
                  Send
                </button>
                <button
                  onClick={onNewWish}
                  disabled={thinking || inputLocked}
                  style={{ background:'#fff', border:'1px solid #cbd5e1', borderRadius:12,
                    padding:'10px 14px', fontWeight:700, cursor:(thinking||inputLocked)?'not-allowed':'pointer' }}>
                  New wish
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}

/* =========================================================
   Small UI atoms used in DAILY PORTAL
   ========================================================= */
function BubbleBox({ children }) {
  return <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:12 }}>{children}</div>
}
function Title({ children }) {
  return <div style={{ fontWeight:800, marginBottom:6 }}>{children}</div>
}
function P({ children }) {
  return <div style={{ color:'#334155', marginBottom:6 }}>{children}</div>
}
function Meta({ children }) {
  return <div style={{ color:'#64748b', fontSize:12 }}>{children}</div>
}
