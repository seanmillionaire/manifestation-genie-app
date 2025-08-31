// pages/chat-genie.js — API-first free-flow UI (no hard-coded copy)
import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'

export default function ChatGenie() {
  const [msgs, setMsgs] = useState([])   // {author:'User'|'Genie', text:string, key:string}
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    listRef.current?.scrollTo(0, 1e9)
  }, [msgs, thinking])

  function key() { return Math.random().toString(36).slice(2) }
  function push(author, text) { setMsgs(m => [...m, { author, text, key: key() }]) }

  async function callApi(prompt) {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs.map(m => ({ author: m.author, content: m.text })), input: prompt })
    })
    const data = await r.json()
    if (Array.isArray(data?.bubbles) && data.bubbles[0]) return data.bubbles
    if (typeof data?.text === 'string') return [data.text]
    return ['As you wish. What’s the specific outcome you want?']
  }

  async function send() {
    const text = (input || '').trim()
    if (!text || thinking) return
    push('User', text)
    setInput('')
    setThinking(true)
    try {
      const bubbles = await callApi(text)
      for (const b of bubbles) push('Genie', b)
    } catch {
      push('Genie', 'Hmm… the lamp flickered. Say it again?')
    } finally {
      setThinking(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
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
            border:'1px solid #e2e8f0', borderRadius:12, padding:12, marginBottom:12
          }}>
            {msgs.map(m => (
              <div key={m.key} style={{
                display:'flex',
                justifyContent: m.author === 'User' ? 'flex-end' : 'flex-start',
                margin:'8px 0'
              }}>
                <div style={{
                  maxWidth:'75%', whiteSpace:'pre-wrap',
                  background: m.author === 'User' ? '#eef2ff' : '#f8fafc',
                  border:'1px solid #e2e8f0', padding:'10px 12px', borderRadius:12
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && <div style={{ color:'#64748b', fontSize:12 }}>thinking…</div>}
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <textarea
              placeholder="Speak to your Genie…"
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              style={{ flex:1, padding:'12px 14px', borderRadius:10, border:'1px solid #cbd5e1', outline:'none' }}
              disabled={thinking}
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
