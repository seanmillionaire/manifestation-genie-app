// pages/chat.js — Manifestation Genie (Light Theme, Full File)
// Flow: clean chat console with white shell, left/right bubbles, gold CTA,
// uses /api/chat for replies, and persists session history locally.

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
  smallNudge:
    "Tip: Ask for one thing in one sentence. Short, specific, alive. I’ll handle the heavy lifting.",
}

/* =========================
   Helpers
   ========================= */
const STORAGE_KEY = 'mg_chat_history_v2'
const NAME_KEY = 'mg_first_name'
const newId = () => Math.random().toString(36).slice(2,10)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const injectName = (t, name='Friend') => t.replaceAll('{firstName}', name)

function loadNameFallback() {
  try {
    const v = localStorage.getItem(NAME_KEY)
    if (v) return v
  } catch {}
  return 'Friend'
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) || []
  } catch { return [] }
}
function saveHistory(messages=[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)) } catch {}
}

/* =========================
   Page
   ========================= */
export default function ChatPage() {
  const [firstName, setFirstName] = useState('Friend')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const streamRef = useRef(null)

  // 1) Load name from profile or localStorage
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.id) {
          const { data, error } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('id', session.user.id)
            .single()
          if (!error && data?.first_name && mounted) {
            setFirstName(data.first_name)
            try { localStorage.setItem(NAME_KEY, data.first_name) } catch {}
            return
          }
        }
      } catch {}
      // fallback
      if (mounted) setFirstName(loadNameFallback())
    })()
    return () => { mounted = false }
  }, [])

  // 2) Load / seed conversation
  useEffect(() => {
    const hist = loadHistory()
    if (hist.length) {
      setMessages(hist)
    } else {
      const greeting = injectName(pick(GenieLang.greetings), loadNameFallback())
      const seed = [
        { id:newId(), role:'assistant', content:greeting },
        { id:newId(), role:'assistant', content:GenieLang.smallNudge },
      ]
      setMessages(seed)
      saveHistory(seed)
    }
  }, [])

  // 3) Auto-scroll
  useEffect(() => {
    if (!streamRef.current) return
    streamRef.current.scrollTop = streamRef.current.scrollHeight
  }, [messages, loading])

  // 4) Send logic
  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    const userMsg = { id:newId(), role:'user', content:text }
    const next = [...messages, userMsg]
    setMessages(next)
    saveHistory(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          message: text,
          history: next.map(({ role, content }) => ({ role, content })),
          firstName
        })
      })
      if (!res.ok) throw new Error('Network error')
      const data = await res.json()
      const reply = (data?.reply || '').trim() || "✨ Noted. Give me one line: What’s the exact outcome you want?"
      const botMsg = { id:newId(), role:'assistant', content:reply }
      const newer = [...next, botMsg]
      setMessages(newer)
      saveHistory(newer)
    } catch (e) {
      const errMsg = { id:newId(), role:'assistant', content:"⚠️ The lamp flickered. Try again in a moment." }
      const newer = [...next, errMsg]
      setMessages(newer)
      saveHistory(newer)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.container}>

        <header style={styles.portalHeader}>
          <h1 style={styles.portalTitle}>Your Personal AI Genie ✨</h1>
          <p style={styles.portalSubtitle}>This is your daily portal to manifest your dreams into reality.</p>
        </header>

        <div style={styles.chatWrap}>
          {/* Scrollable message stream */}
          <div style={styles.chatStream} ref={streamRef}>
            {messages.map((m) => {
              const isUser = m.role === 'user'
              return (
                <div key={m.id} style={isUser ? styles.rowUser : styles.rowAI}>
                  {!isUser && (
                    <img
                      alt="Genie"
                      src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f9de.svg"
                      style={styles.avatar}
                    />
                  )}
                  <div style={isUser ? styles.bubbleUser : styles.bubbleAI}>
                    {!isUser && <div style={styles.nameLabelAI}>Genie</div>}
                    {isUser && <div style={styles.nameLabelUser}>{firstName}</div>}
                    <div style={styles.bubbleText} dangerouslySetInnerHTML={{ __html: escape(m.content) }} />
                    {/* Like badge (placeholder) */}
                    {!isUser && (
                      <div style={{ marginTop: 8 }}>
                        <button type="button" style={styles.likeBtn}>
                          👍 Like
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {loading && (
              <div style={styles.rowAI}>
                <img
                  alt="Genie"
                  src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f9de.svg"
                  style={styles.avatar}
                />
                <div style={styles.bubbleAI}>
                  <div style={styles.nameLabelAI}>Genie</div>
                  <div style={styles.bubbleText}>…typing magic</div>
                </div>
              </div>
            )}
          </div>

          {/* Input row */}
          <div style={styles.chatInputRow}>
            <input
              style={styles.chatInput}
              placeholder="Speak to your Genie… 🧞‍♀️"
              value={input}
              onChange={(e)=>setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button style={styles.btn} onClick={handleSend} disabled={loading || !input.trim()}>
              {loading ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

/* =========================
   Tiny utility
   ========================= */
function escape(s=''){
  // very light HTML escaping; server should already sanitize
  return s.replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))
}

/* =========================
   Styles — Light Theme
   ========================= */
const styles = {
  /* Page */
  wrap: { minHeight:'100vh', background:'#ffffff', color:'#111111', padding:'24px' },
  container: { maxWidth: 980, margin: '0 auto' },

  /* Header */
  portalHeader: { textAlign:'left', marginBottom:18 },
  portalTitle: { fontSize:32, fontWeight:900, margin:0, color:'#111', letterSpacing:.2 },
  portalSubtitle: { fontSize:16, color:'#475569', marginTop:6 },

  /* Chat shell */
  chatWrap: {
    background:'#fff',
    border:'1px solid #e5e7eb',
    borderRadius:20,
    boxShadow:'0 18px 44px rgba(0,0,0,.08)',
    overflow:'hidden',
  },
  chatStream: {
    padding:20,
    maxHeight:'calc(100vh - 280px)',
    overflowY:'auto',
    background:'#fff'
  },

  /* Rows */
  rowAI:   { display:'flex', gap:10, alignItems:'flex-start', margin:'8px 0' },
  rowUser: { display:'flex', gap:10, alignItems:'flex-start', margin:'8px 0', justifyContent:'flex-end' },

  /* Avatars + labels */
  avatar: { width:28, height:28, borderRadius:'50%', flex:'0 0 auto' },
  nameLabelAI: { fontSize:12, color:'#475569', margin:'0 0 4px' },
  nameLabelUser: { fontSize:12, color:'#475569', textAlign:'right', margin:'0 0 4px' },

  /* Bubbles */
  bubbleAI: {
    maxWidth:'86%',
    background:'#f8fafc',
    border:'1px solid #e5e7eb',
    color:'#0f172a',
    padding:'12px 14px',
    borderRadius:12
  },
  bubbleUser: {
    maxWidth:'86%',
    background:'rgba(255,214,0,0.12)',
    border:'1px solid rgba(255,214,0,0.35)',
    color:'#111111',
    padding:'12px 14px',
    borderRadius:12
  },
  bubbleText: { fontSize:15, lineHeight:1.6, wordBreak:'break-word', overflowWrap:'anywhere' },

  /* Like button */
  likeBtn: {
    display:'inline-flex', alignItems:'center', gap:6,
    background:'#fff',
    border:'1px solid #e5e7eb',
    borderRadius:999, padding:'4px 10px',
    fontSize:12, cursor:'pointer'
  },

  /* Input */
  chatInputRow: {
    display:'flex', gap:10, alignItems:'center',
    padding:12, borderTop:'1px solid #e5e7eb', background:'#fff'
  },
  chatInput: {
    flex:1, border:'1px solid #e5e7eb', borderRadius:12,
    padding:'12px 14px', outline:'none', background:'#fff', color:'#111'
  },

  /* Buttons */
  btn: {
    padding:'12px 16px',
    borderRadius:14,
    border:'2px solid #000',
    background:'#FFD600',
    color:'#111',
    fontWeight:900,
    letterSpacing:.2,
    cursor:'pointer',
    boxShadow:'0 18px 40px rgba(0,0,0,.10)'
  }
}
