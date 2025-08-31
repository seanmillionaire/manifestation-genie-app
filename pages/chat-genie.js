// /pages/chat-genie.js
import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { get, set, newId, toPlainMessages } from '../src/flowState'

function escapeHTML(s=''){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) }

export default function ChatGenie() {
  // ✅ Use the SAME state source as /pages/chat.js
  const [S, setS] = useState(get())
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const listRef = useRef(null)

  useEffect(() => { listRef.current?.scrollTo(0, 1e9) }, [S.thread, thinking])

  // ✅ Hydrate firstName from Supabase, then re-read flowState (exactly like chat.js)
  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined') return
      const cur = get()
      if (!cur.firstName || cur.firstName === 'Friend') {
        try {
          const m = await import('../src/userName')     // { hydrateFirstNameFromSupabase }
          await m.hydrateFirstNameFromSupabase()
          setS(get())                                   // re-read → UI updates to real name
        } catch {}
      }
    })()

    // keep in sync if another tab updates the cached name
    const onStorage = (e) => { if (e.key === 'mg_first_name') setS(get()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  async function callApi(text) {
    const state = get()
    const resp = await fetch('/api/chat', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        userName: state.firstName || null,      // ✅ send real first name
        context: {
          wish: state.currentWish?.wish || null,
          block: state.currentWish?.block || null,
          micro: state.currentWish?.micro || null,
          vibe: state.vibe || null
        },
        messages: [
          ...toPlainMessages(state.thread || []),
          { role:'user', content: text }
        ]
      })
    })
    const data = await resp.json()
    return (data && (data.reply || data.text)) || 'As you wish—what exactly do you want?'
  }

  const send = async () => {
    const text = (input || '').trim()
    if (!text || thinking) return

    // push user message (label uses S.firstName)
    const msg = {
      id: newId(),
      role: 'user',
      author: S.firstName || 'You',
      content: escapeHTML(text)
    }
    const thread = [...(S.thread || []), msg]
    set({ thread })
    setS(get())
    setInput('')
    setThinking(true)

    try {
      const reply = await callApi(text)
      const ai = { id: newId(), role:'assistant', author:'Genie', content: escapeHTML(reply) }
      set({ thread: [...get().thread, ai] })
      setS(get())
    } catch {
      const ai = { id: newId(), role:'assistant', author:'Genie', content: 'The lamp flickered. Try again.' }
      set({ thread: [...get().thread, ai] })
      setS(get())
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
          Genie Chat, {S.firstName || 'Friend'}
        </h1>

        <div ref={listRef} style={{
          minHeight:360, maxHeight:520, overflowY:'auto',
          border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, padding:12, background:'#fafafa'
        }}>
          {(S.thread || []).map(m => (
            <div key={m.id} style={{ display:'flex', gap:8, margin:'8px 0', flexDirection: m.role === 'assistant' ? 'row' : 'row-reverse' }}>
              <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(0,0,0,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                {m.role === 'assistant' ? '🔮' : '🙂'}
              </div>
              <div style={{maxWidth:'80%'}}>
                <div style={{ fontSize:12, opacity:.65, margin: m.role === 'assistant' ? '0 0 4px 6px' : '0 6px 4px 0', textAlign: m.role === 'assistant' ? 'left' : 'right' }}>
                  {m.role === 'assistant' ? 'Genie' : (m.author || S.firstName || 'You')}
                </div>
                <div style={{
                  background: m.role === 'assistant' ? 'rgba(0,0,0,0.04)' : 'rgba(255,214,0,0.15)',
                  border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, padding:'10px 12px'
                }}>
                  {m.content}
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
            placeholder={`Speak to your Genie, ${S.firstName || 'Friend'}…`}
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
