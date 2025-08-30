// pages/chat-genie.js
// Manifestation Genie — chat with lamp intro + multi-bubble streaming + resilient fallback

import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'

// client-only, because it uses localStorage
const GenieDailyPortal = dynamic(() => import('../components/GenieDailyPortal'), { ssr: false })

// Prefer the local brain; if it’s missing or errors we’ll fall back to /api/chat
let localBrain = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const brain = require('../src/genieBrain')
  localBrain = {
    genieIntro: brain.genieIntro,          // NEW
    genieReply: brain.genieReply,
    dailyAssignment: brain.dailyAssignment
  }
} catch (_) { /* keep null; we’ll use API fallback */ }

// Supabase is optional here; we only use it to guess first name if available
let supabase = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  supabase = require('../src/supabaseClient').supabase
} catch (_) { /* optional */ }

function useFirstName() {
  const [firstName, setFirstName] = useState('Friend')
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

export default function ChatGenie() {
  const firstName = useFirstName()
  const [started, setStarted] = useState(false)   // NEW: lamp idle -> chat
  const [msgs, setMsgs] = useState([])            // start empty; Genie speaks only after lamp touch
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  // autoscroll
  useEffect(() => {
    listRef.current?.scrollTo(0, 1e9)
  }, [msgs, thinking, started])

  // helper: append a single message
  function push(author, text) {
    setMsgs(m => [...m, { author, text }])
  }

  // helper: stream bubbles (array of strings) with a small delay
  async function streamBubbles(author, bubbles = [], delayMs = 350) {
    for (const b of bubbles) {
      push(author, b)
      await new Promise(r => setTimeout(r, delayMs))
    }
  }

  // Lamp click -> call brain.genieIntro, stream bubbles
  async function onLampClick() {
    if (started) return
    setStarted(true)
    setThinking(true)
    try {
      if (localBrain?.genieIntro) {
        const res = await localBrain.genieIntro({ user: { firstName } })
        const bubbles = Array.isArray(res?.bubbles) && res.bubbles.length ? res.bubbles : [
          'Ahh… you touched the lamp. 🔮',
          'I’ve been waiting. I’m the Manifestation Genie.',
          'Tell me what’s on your mind — one word is enough, or drop the whole story.'
        ]
        await streamBubbles('Genie', bubbles)
      } else {
        // Fallback intro if brain missing
        await streamBubbles('Genie', [
          'Ahh… you touched the lamp. 🔮',
          'I’ve been waiting. I’m the Manifestation Genie.',
          'Tell me what’s on your mind — one word is enough, or drop the whole story.'
        ])
      }
      inputRef.current?.focus()
    } catch {
      push('Genie', 'The lamp flickered. Try tapping again if I go quiet.')
    } finally {
      setThinking(false)
    }
  }

  async function callLocalBrain(prompt) {
    if (!localBrain?.genieReply) throw new Error('local-brain-missing')
    // IMPORTANT: pass user correctly
    const res = await localBrain.genieReply({
      input: prompt,
      user: { firstName }
    })
    // Prefer bubbles; fallback to text
    if (Array.isArray(res?.bubbles) && res.bubbles.length) return res.bubbles
    const text = res?.text || String(res || '')
    // split by paragraphs for a pseudo-stream
    return text.split(/\n{2,}/g).filter(Boolean)
  }

  async function callApi(prompt) {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        userName: firstName
      })
    })
    if (!r.ok) {
      const t = await r.text().catch(()=> '')
      throw new Error(`api-error ${r.status}: ${t}`)
    }
    const data = await r.json()
    const txt = data.text || data.message || ''
    return txt.split(/\n{2,}/g).filter(Boolean)
  }

  async function getReplyBubbles(prompt) {
    try { return await callLocalBrain(prompt) }
    catch { /* fall through */ }
    return await callApi(prompt)
  }

  async function onSend() {
    const trimmed = input.trim()
    if (!trimmed || thinking) return

    push(firstName, trimmed)
    setInput('')
    setThinking(true)

    try {
      const bubbles = await getReplyBubbles(trimmed)
      const safe = (Array.isArray(bubbles) && bubbles.length)
        ? bubbles
        : ['As you wish — tell me the goal in one short line and I’ll give you your first 3 moves.']
      await streamBubbles('Genie', safe)
    } catch (err) {
      push('Genie', 'Hmm… the lamp flickered (network/brain error). Say the wish again, or refresh.')
    } finally {
      setThinking(false)
      inputRef.current?.focus()
    }
  }

  async function onNewWish() {
    setThinking(true)
    try {
      let seed = null
      if (localBrain?.dailyAssignment) {
        const d = localBrain.dailyAssignment({ name: firstName })
        seed = `**${d.title}** — ${d.why}\n• ${d.steps.join('\n• ')}`
      }
      push('Genie', seed || 'It is done — write the one-line wish, then I’ll drop your first 3 moves.')
    } catch {
      push('Genie', 'It is done — what’s today’s wish?')
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

  // --- UI ---
  return (
    <>
      <Head>
        <title>Manifestation Genie</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={{ background:'#fff', minHeight:'100vh', padding:'20px 0' }}>
        <div style={{
          width:'min(960px, 92vw)', margin:'0 auto',
          background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:14, padding:20,
          position:'relative'
        }}>
          <div style={{ fontWeight:800, fontSize:22, display:'flex', alignItems:'center', gap:10, margin:'6px 6px 12px' }}>
            <span style={{ fontSize:24 }}>🧞‍♂️</span>
            <span>Manifestation Genie</span>
          </div>

          {/* LAMP IDLE SCREEN */}
          {!started && (
            <div
              onClick={onLampClick}
              style={{
                height:'60vh',
                border:'1px dashed #cbd5e1',
                borderRadius:12,
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                flexDirection:'column',
                gap:12,
                background:'#fff',
                cursor:'pointer',
                userSelect:'none'
              }}
            >
              <div style={{ fontSize:72, animation:'pulse 2s infinite' }}>🧞‍♂️</div>
              <div style={{ fontSize:16, color:'#334155', textAlign:'center', padding:'0 16px' }}>
                Touch the lamp when you’re ready to interact with the Genie
              </div>
              <style jsx>{`
                @keyframes pulse {
                  0% { transform: scale(1); opacity: 1; }
                  50% { transform: scale(1.08); opacity: 0.85; }
                  100% { transform: scale(1); opacity: 1; }
                }
              `}</style>
            </div>
          )}

          {/* CHAT WINDOW */}
          {started && (
            <>
              <div
                ref={listRef}
                style={{
                  height:'60vh', overflowY:'auto', background:'#fff',
                  border:'1px solid #e2e8f0', borderRadius:12, padding:16
                }}
              >
                {msgs.map((m, i) => (
                  <div key={i} style={{
                    display:'flex', marginBottom:10,
                    justifyContent: m.author === 'Genie' ? 'flex-start' : 'flex-end'
                  }}>
                    <div style={{
                      maxWidth:'75%',
                      background: m.author === 'Genie' ? '#f1f5f9' : '#fef3c7',
                      border:'1px solid #e2e8f0',
                      padding:'10px 12px', borderRadius:12, whiteSpace:'pre-wrap'
                    }}>
                      {m.text}
                    </div>
                  </div>
                ))}

                {thinking && (
                  <div style={{ display:'flex', marginBottom:10, justifyContent:'flex-start' }}>
                    <div style={{
                      background:'#f1f5f9', border:'1px solid #e2e8f0',
                      padding:'10px 12px', borderRadius:12
                    }}>
                      <span className="dots">Genie is thinking</span>
                      <style jsx>{`
                        .dots::after {
                          content: '…';
                          animation: pulse 1.2s infinite steps(4, end);
                        }
                        @keyframes pulse {
                          0% { content: '.'; }
                          33% { content: '..'; }
                          66% { content: '...'; }
                          100% { content: '....'; }
                        }
                      `}</style>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display:'flex', gap:10, marginTop:12 }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Speak to your Genie… ✨"
                  style={{
                    flex:1, padding:'12px 14px', borderRadius:10,
                    border:'1px solid #cbd5e1', outline:'none'
                  }}
                  disabled={thinking}
                />
                <button
                  onClick={onSend}
                  disabled={thinking || !input.trim()}
                  style={{
                    background:'#facc15', color:'#000', border:'none',
                    borderRadius:12, padding:'10px 18px', fontWeight:800,
                    cursor: thinking || !input.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  Send
                </button>
                <button
                  onClick={onNewWish}
                  disabled={thinking}
                  style={{
                    background:'#fff', border:'1px solid #cbd5e1',
                    borderRadius:12, padding:'10px 14px', fontWeight:700,
                    cursor: thinking ? 'not-allowed' : 'pointer'
                  }}
                >
                  New wish
                </button>
              </div>
            </>
          )}

          <div style={{ textAlign:'center', color:'#64748b', fontSize:12, marginTop:10 }}>
            © {new Date().getFullYear()} Manifestation Genie. Powered by HypnoticMeditations.ai
          </div>
        </div>
      </main>
    </>
  )
}
