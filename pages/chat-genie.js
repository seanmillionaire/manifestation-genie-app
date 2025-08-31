// /pages/chat-genie.js
import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { get } from '../src/flowState'

// Read first name from flowState, then localStorage (fast), else "Friend"
function getFirstNameCached() {
  if (typeof window === 'undefined') return get().firstName || 'Friend'
  return get().firstName || localStorage.getItem('mg_first_name') || 'Friend'
}

export default function ChatGenie() {
  const [msgs, setMsgs] = useState([])   // {author:'User'|'Genie', text, key}
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [name, setName] = useState(getFirstNameCached())
  const listRef = useRef(null)

  useEffect(() => { listRef.current?.scrollTo(0, 1e9) }, [msgs, thinking])

  // Ensure the name arrives from Supabase and keep it in sync
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (!name || name === 'Friend') {
          const m = await import('../src/userName') // { hydrateFirstNameFromSupabase }
          await m.hydrateFirstNameFromSupabase()
        }
      } catch {}
      if (alive) setName(getFirstNameCached())
    })()

    // If another tab updates 'mg_first_name', reflect it here
    const onStorage = e => { if (e.key === 'mg_first_name') setName(e.newValue || 'Friend') }
    if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
    return () => {
      alive = false
      if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
    }
  }, []) // run once on mount

  function key() { return Math.random().toString(36).slice(2) }
  function push(author, text) { setMsgs(m => [...m, { author, text, key: key() }]) }

  async function callApi(text) {
    const S = get()
    const realName = name || getFirstNameCached()
    const r = await fetch('/api/chat', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        userName: realName || null, // ← send your name to the Genie
        context: {
          wish: S.currentWish?.wish || null,
          block: S.currentWish?.block || null,
          micro: S.currentWish?.micro || null,
          vibe: S.vibe || null
        },
        messages: msgs.map(m => ({
          role: m.author === 'Genie' ? 'assistant' : 'user',
          content: m.text
        })).concat({ role:'user', content: text })
      })
    })
    const data = await r.json()
    if (Array.isArray(data?.bubbles) && data.bubbles[0]) return data.bubbles
    if (typeof data?.text === 'string') return [data.text]
    return ['As you wish. What’s the specific outcome you want?']
  }

  async function send() {
    const text = (input || '').trim()
    if (!text || thinking) return
    push('User', text) // label stays 'User'; UI shows your name below
    setInput('')
    setThinking(true)
    try {
      const bubbles = await callApi(text)
      for (const b of bubbles) push('Genie', b)
    } catch {
      push('Genie', 'The lamp flickered. Try again.')
    } finally {
      setThinking(false)
      listRef.current?.scrollTo(0, 1e9)
    }
  }

  return (
    <>
      <Head><title>Genie Chat</title></Head>
      <main style={{ width:'min(900px, 94vw)', margin:'30px auto' }}>
        <h1 style={{ fontSize:28, fontWeight:900, margin:'0 0 12px' }}>
          Genie Chat, {name || 'Friend'}
        </h1>

        <div ref={listRef} style={{
          minHeight:360, maxHeight:520, overflowY:'auto',
          border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, padding:12, background:'#fafafa'
        }}>
          {msgs.map(m => (
            <div key={m.key} style={{ display:'flex', gap:8, margin:'8px 0', flexDirection: m.author === 'Genie' ? 'row' : 'row-reverse' }}>
              <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(0,0,0,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                {m.author === 'Genie' ? '🔮' : '🙂'}
              </div>
              <div style={{maxWidth:'80%'}}>
                <div style={{ fontSize:12, opacity:.65, margin: m.author === 'Genie' ? '0 0 4px 6px' : '0 6px 4px 0', textAlign: m.author === 'Genie' ? 'left' : 'right' }}>
                  {m.author === 'Genie' ? 'Genie' : (name || 'You')}
                </div>
                <div style={{
                  background: m.author === 'Genie' ? 'rgba(0,0,0,0.04)' : 'rgba(255,214,0,0.15)',
                  border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, padding:'10px 12px'
                }}>
                  {m.text}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{display:'flex', gap:10, marginTop:10}}>
          <textarea
            rows={2}
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={`Speak to your Genie, ${name || 'Friend'}…`}
            style={{flex:1, padding:'12px 14px', borderRadius:12, border:'1px solid rgba(0,0,0,0.15)'}}
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
      </main>
    </>
  )
}
