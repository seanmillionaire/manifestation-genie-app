// pages/chat.js
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'

export default function Chat() {
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(null)      // null=checking
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const inputRef = useRef(null)
  const listRef  = useRef(null)
  const PAYHIP_URL = 'https://payhip.com/b/U7Z5m' // <-- set your product link

  // --- auth session ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // --- allowlist check ---
  useEffect(() => {
    async function run() {
      if (!session?.user?.email) return
      const { data, error } = await supabase
        .from('allowlist')
        .select('status')
        .eq('email', session.user.email)
        .maybeSingle()
      if (error) setAllowed(false); else setAllowed(data?.status === 'active')
    }
    run()
  }, [session])

  // --- auto-scroll to bottom when messages change ---
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, sending])

  async function handleSend(e) {
    e.preventDefault()
    const input = inputRef.current.value.trim()
    if (!input || sending) return

    const next = [...messages, { role: 'user', content: input }]
    setMessages(next)
    inputRef.current.value = ''
    setSending(true)

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next })
      })
      const data = await r.json()
      setMessages([...next, { role: 'assistant', content: data.reply || '…' }])
    } catch (err) {
      setMessages([...next, { role: 'assistant', content: 'Error contacting Genie.' }])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.form.requestSubmit()
    }
  }

  if (!session) {
    return (
      <div className="wrap">
        <div className="card">
          <p>Not logged in.</p>
          <a href="/login" className="btn">Go to Login</a>
        </div>
        <Style/>
      </div>
    )
  }

  if (allowed === null) return <LoaderScreen text="Checking access…" />
  if (!allowed) {
    return (
      <div className="wrap">
        <div className="card">
          <h2>Access inactive</h2>
          <p>Your email isn’t active for Manifestation Genie.</p>
          <a href={PAYHIP_URL} className="btn">Get Access</a>
        </div>
        <Style/>
      </div>
    )
  }

  return (
    <div className="wrap">
      <h1 className="title">Manifestation Genie</h1>
      <p className="welcome">Welcome, {session.user.email}</p>

      <div className="chatCard">
        <div className="list" ref={listRef}>
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === 'user' ? 'me' : 'genie'}`}>
              {m.role === 'assistant' && <span className="genieTag">Genie</span>}
              {m.role === 'user' && <span className="youTag">You</span>}
              <div className="msg">{m.content}</div>
            </div>
          ))}
          {sending && (
            <div className="bubble genie">
              <span className="genieTag">Genie</span>
              <div className="dots"><span/><span/><span/></div>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="row">
          <textarea
            ref={inputRef}
            name="prompt"
            placeholder="Type your message…"
            className="input"
            rows={2}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button type="submit" className="btn" disabled={sending}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </form>
      </div>

      <button className="linkBtn" onClick={() => supabase.auth.signOut()}>Logout</button>
      <Style/>
    </div>
  )
}

// small loader screen component
function LoaderScreen({ text }) {
  return (
    <div className="wrap">
      <div className="card center">
        <div className="dots big"><span/><span/><span/></div>
        <p style={{marginTop:12}}>{text}</p>
      </div>
      <Style/>
    </div>
  )
}

// Styled-JSX: paste once; tweaks the whole page without separate CSS files
function Style() {
  return (
    <style jsx>{`
      .wrap { max-width: 860px; margin: 40px auto; padding: 0 16px; font-family: Inter, system-ui, Arial; }
      .title { margin: 0 0 6px; }
      .welcome { color: #555; margin: 0 0 16px; }
      .chatCard, .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #fff; }
      .card.center { text-align: center; padding: 40px 16px; }
      .list { height: 360px; overflow-y: auto; padding: 4px; background: #fafafa; border-radius: 8px; }
      .row { display: flex; gap: 8px; margin-top: 12px; }
      .input { flex: 1; resize: none; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
      .btn { background: #6d28d9; color: #fff; border: 0; border-radius: 8px; padding: 10px 14px; cursor: pointer; }
      .btn:disabled { opacity: 0.6; cursor: default; }
      .linkBtn { margin-top: 16px; border: 0; background: transparent; color: #6d28d9; cursor: pointer; }

      /* bubbles */
      .bubble { max-width: 78%; margin: 10px 8px; padding: 10px 12px; border-radius: 12px; position: relative; }
      .bubble.me { margin-left: auto; background: #6d28d9; color: white; }
      .bubble.genie { background: white; border: 1px solid #e5e7eb; }
      .genieTag, .youTag { font-size: 12px; opacity: 0.7; display: block; margin-bottom: 4px; }
      .dots { display: inline-flex; gap: 6px; align-items: center; height: 18px; }
      .dots span { width: 6px; height: 6px; background: #6d28d9; border-radius: 50%; animation: blink 1.2s infinite ease-in-out; }
      .bubble.me .dots span { background: white; }
      .dots.big span { width: 8px; height: 8px; }
      .dots span:nth-child(2) { animation-delay: 0.15s; }
      .dots span:nth-child(3) { animation-delay: 0.3s; }
      @keyframes blink { 0%, 80%, 100% { opacity: 0.2 } 40% { opacity: 1 } }
    `}</style>
  )
}
