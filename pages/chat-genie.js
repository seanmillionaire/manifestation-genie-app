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

  // 🔒 Gate state (default locked until user taps the lamp)
  const [unlocked, setUnlocked] = useState(false)

  // keep scroll behavior identical
  useEffect(() => { listRef.current?.scrollTo(0, 1e9) }, [S.thread, thinking])

  // ✅ Hydrate firstName from Supabase, then re-read flowState (exactly like chat.js)
  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined') return
      const cur = get()
      if (!cur.firstName || cur.firstName === 'Friend') {
        try {
          const m = await import('../src/userName')     // { hydrateFirstNameFromSupabase }
          await m.hydrateFirstNameFromSupabase?.()
          setS(get())                                   // re-read → UI updates to real name
        } catch {}
      }
    })()

    // keep in sync if another tab updates the cached name
    const onStorage = (e) => { if (e.key === 'mg_first_name') setS(get()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // 🔒 Remember unlock just for this tab (so refresh keeps it open)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const v = sessionStorage.getItem('mg_genie_unlocked')
    if (v === '1') setUnlocked(true)
  }, [])
  const unlock = () => {
    setUnlocked(true)
    if (typeof window !== 'undefined') sessionStorage.setItem('mg_genie_unlocked','1')
  }

  async function callApi(text) {
    const state = get()
    const resp = await fetch('/api/chat-genie', {
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
      <Head>
        <title>Genie Chat</title>
        {/* minimal styles for lamp animation, isolated to this page */}
        <style>{`
          @keyframes mg-pulse { 0%{transform:scale(1);opacity:.75} 70%{transform:scale(1.25);opacity:0} 100%{transform:scale(1.25);opacity:0} }
          .mg-pulse-ring{ position:absolute; inset:0; border-radius:9999px; background:radial-gradient(circle, rgba(168,85,247,0.28), rgba(99,102,241,0.18) 60%, transparent 70%); animation: mg-pulse 1.6s cubic-bezier(.4,0,.2,1) infinite; }
          .mg-pulse-ring.delay{ animation-delay:.6s; }
          .mg-overlay{ position:fixed; inset:0; display:flex; align-items:center; justify-content:center; padding:20px; background:linear-gradient(180deg, rgba(0,0,0,.28), rgba(0,0,0,.38)); z-index:50; }
          .mg-card{ width:min(560px, 92vw); border-radius:16px; border:1px solid rgba(255,255,255,.25); background:rgba(255,255,255,.9); backdrop-filter:saturate(1.2) blur(6px); box-shadow:0 20px 50px rgba(0,0,0,.25); padding:28px 24px; text-align:center; position:relative; }
          .mg-btn{ position:relative; width:170px; height:170px; border-radius:9999px; display:flex; align-items:center; justify-content:center; border:none; background:linear-gradient(135deg, #f0abfc 0%, #a78bfa 50%, #60a5fa 100%); cursor:pointer; outline: none; }
          .mg-btn:focus-visible{ box-shadow:0 0 0 3px #6366f1, 0 0 0 6px #e0e7ff; }
          .mg-emoji{ font-size:84px; line-height:1; filter: drop-shadow(0 6px 18px rgba(99,102,241,.45)); }
          .mg-title{ font-weight:900; font-size:22px; margin:16px 0 6px; }
          .mg-sub{ font-size:14px; opacity:.75; }
          .mg-fadeout{ animation: mg-fade .35s ease forwards; }
          @keyframes mg-fade { to { opacity:0; visibility:hidden } }
        `}</style>
      </Head>

      <main style={{ width:'min(900px, 94vw)', margin:'30px auto', position:'relative' }}>
        {/* 👇 THIS is your original console UI, untouched */}
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

        {/* 🔒 LAMP OVERLAY — sits ON TOP until unlocked. Removes nothing from your design. */}
        {!unlocked && (
          <div className="mg-overlay" role="dialog" aria-modal="true" aria-labelledby="mg-title" aria-describedby="mg-desc">
            <div className="mg-card">
              <div style={{ position:'relative', display:'inline-block' }}>
                <button
                  className="mg-btn"
                  onClick={unlock}
                  aria-label="Touch the Lamp to speak with the Genie"
                  title="Touch the Lamp to speak with the Genie"
                  autoFocus
                >
                  <div className="mg-pulse-ring" aria-hidden="true" />
                  <div className="mg-pulse-ring delay" aria-hidden="true" />
                  <span className="mg-emoji">🔮</span>
                </button>
              </div>
              <div id="mg-title" className="mg-title">Touch the Lamp to speak with the Genie</div>
              <div id="mg-desc" className="mg-sub">
                {S.firstName ? `Welcome, ${S.firstName}!` : 'Welcome!'} Tap the glowing orb to begin.
              </div>
              <p className="sr-only">After you touch the lamp, the chat will appear.</p>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
