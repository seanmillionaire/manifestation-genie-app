// pages/chat-genie.js — stripped UI (no intros, counters, emojis, or "New wish")
import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'

export default function ChatGenie() {
  const [brain, setBrain] = useState(null)   // local brain module
  const [msgs, setMsgs] = useState([])       // {author:'User'|'Genie', text:string, key:string}
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const listRef = useRef(null)
  const firstName = 'You'

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const mod = await import('../src/genieBrain.js')
        if (active) setBrain(mod)
      } catch (e) {
        console.warn('genieBrain load failed', e)
        if (active) setBrain(null)
      }
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [msgs, thinking])

  function key() { return Math.random().toString(36).slice(2) }
  function push(author, text) { setMsgs(m => [...m, { author, text, key: key() }]) }

  async function getReply(prompt) {
    if (brain?.genieReply) {
      const res = await brain.genieReply({ input: prompt, user: { firstName } })
      if (Array.isArray(res?.bubbles) && res.bubbles[0]) return res.bubbles[0]
      if (typeof res?.text === 'string') return res.text
    }
    return 'Sorry, the Genie is offline.'
  }

  async function send() {
    const text = (input || '').trim()
    if (!text || thinking) return
    push('User', text)
    setInput('')
    setThinking(true)
    try {
      const reply = await getReply(text)
      push('Genie', reply)
    } catch (e) {
      push('Genie', 'Sorry, something went wrong.')
    } finally {
      setThinking(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      <Head>
        <title>Manifestation Genie</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={{ background:'#fff', minHeight:'100vh', padding:'20px 0' }}>
        <div style={{
          width:'min(960px, 92vw)', margin:'0 auto',
          background:'#f8fafc', border:'1px solid #e2e8f0',
          borderRadius:14, padding:20
        }}>
          <div style={{ fontWeight:800, fontSize:22, margin:'6px 6px 12px' }}>
            Manifestation Genie
          </div>

          <div ref={listRef} style={{
            height:'60vh', overflow:'auto', background:'#fff',
            border:'1px solid #e2e8f0', borderRadius:12, padding:16
          }}>
            {msgs.map(m => (
              <div key={m.key} style={{
                display:'flex',
                justifyContent: m.author === 'User' ? 'flex-end' : 'flex-start',
                margin:'8px 0'
              }}>
                <div style={{
                  maxWidth:'80%', whiteSpace:'pre-wrap',
                  border:'1px solid #e5e7eb', padding:'10px 12px',
                  borderRadius:10, background: m.author === 'User' ? '#eef2ff' : '#f8fafc'
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div style={{ color:'#64748b', fontSize:12, padding:'6px 2px' }}>thinking…</div>
            )}
          </div>

          <div style={{
            display:'flex', gap:8, marginTop:12, alignItems:'center',
            background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:8
          }}>
            <textarea
              placeholder="Type your goal…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={thinking}
              style={{
                flex:1, resize:'none', border:'none', outline:'none',
                minHeight:44, fontSize:16, background:'transparent'
              }}
            />
            <button
              onClick={send}
              disabled={thinking || !input.trim()}
              style={{
                background:'#facc15', border:'1px solid #eab308',
                borderRadius:10, padding:'10px 16px', fontWeight:700,
                cursor:(thinking || !input.trim()) ? 'not-allowed' : 'pointer'
              }}
            >
              Send
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
