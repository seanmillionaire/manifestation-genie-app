// pages/chat.js
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'

export default function Chat() {
  const [session, setSession] = useState(null)         // Supabase auth session
  const [allowed, setAllowed] = useState(null)         // allowlist gate
  const [messages, setMessages] = useState([])         // UI messages
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState(null)     // DB session id (public.sessions.id)
  const inputRef = useRef(null)
  const listRef  = useRef(null)
  const PAYHIP_URL = 'https://hypnoticmeditations.ai/b/U7Z5m' // <-- set your real Payhip product URL

  // --- auth session ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // --- allowlist gate ---
  useEffect(() => {
    async function run() {
      if (!session?.user?.email) return
      const { data, error } = await supabase
        .from('allowlist')
        .select('status')
        .eq('email', session.user.email)
        .maybeSingle()
      setAllowed(!error && data?.status === 'active')
    }
    run()
  }, [session])

  // --- ensure a DB chat "session" exists for this user; then load history ---
  useEffect(() => {
    async function bootstrap() {
      if (!allowed || !session?.user?.id) return
      const userId = session.user.id

      // 1) try to reuse most-recent session
      const { data: found } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let sid = found?.id
      // 2) if none, create one
      if (!sid) {
        const { data: created, error: cErr } = await supabase
          .from('sessions')
          .insert([{ user_id: userId, title: 'Daily chat' }])
          .select('id')
          .single()
        if (cErr) { console.error(cErr); return }
        sid = created.id
      }
      setSessionId(sid)

      // 3) load messages for that session
      const { data: rows, error: mErr } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('session_id', sid)
        .order('created_at', { ascending: true })
      if (mErr) { console.error(mErr); return }
      setMessages(rows || [])
    }
    if (allowed !== null) bootstrap()
  }, [allowed, session])

  // --- auto-scroll on update ---
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, sending])

  async function handleSend(e) {
    e.preventDefault()
    const input = inputRef.current.value.trim()
    if (!input || sending || !sessionId || !session?.user?.id) return

    const next = [...messages, { role: 'user', content: input }]
    setMessages(next)
    inputRef.current.value = ''
    setSending(true)

    // insert user message
    await supabase.from('messages').insert([{
      session_id: sessionId,
      user_id: session.user.id,
      role: 'user',
      content: input
    }])

    try {
      // ask OpenAI via your API route
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next })
      })
      const data = await r.json()
      const reply = data.reply || '…'

      // show & store assistant reply
      const final = [...next, { role: 'assistant', content: reply }]
      setMessages(final)

      await supabase.from('messages').insert([{
        session_id: sessionId,
        user_id: session.user.id,
        role: 'assistant',
        content: reply
      }])
    } catch (err) {
      console.error(err)
      const final = [...messages, { role: 'assistant', content: 'Error contacting Genie.' }]
      setMessages(final)
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

  // ---- UI gates ----
  if (!session) {
    return (
      <div className="wrap"><div className="card">
        <p>Not logged in.</p><a href="/login" className="btn">Go to Login</a>
      </div><Style/></div>
    )
  }
  if (allowed === null) return <LoaderScreen text="Checking access…" />
  if (!allowed) {
    return (
      <div className="wrap"><div className="card">
        <h2>Access inactive</h2>
        <p>Your email isn’t active for Manifestation Genie.</p>
        <a href={PAYHIP_URL} className="btn">Get Access</a>
      </div><Style/></div>
    )
  }

  // ---- main chat ----
  return (
    <div className="wrap">
      <h1 className="title">Manifestation Genie</h1>
      <p className="welcome">Welcome, {session.user.email}</p>

      <div className="chatCard">
        <div className="list" ref={listRef}>
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === 'user' ? 'me' : 'genie'}`}>
              <span className="tag">{m.role === 'user' ? 'You' : 'Genie'}</span>
              <div className="msg">{m.content}</div>
            </div>
          ))}
          {sending && (
            <div className="bubble genie">
              <span className="tag">Genie</span>
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

function LoaderScreen({ text }) {
  return (
    <div className="wrap"><div className="card center">
      <div className="dots big"><span/><span/><span/></div>
      <p style={{marginTop:12}}>{text}</p>
    </div><Style/></div>
  )
}

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
      .bubble { max-width: 78%; margin: 10px 8px; padding: 10px 12px; border-radius: 12px; position: relative; }
      .bubble.me { margin-left: auto; background: #6d28d9; color: white; }
      .bubble.genie { background: white; border: 1px solid #e5e7eb; }
      .tag { font-size: 12px; opacity: 0.7; display: block; margin-bottom: 4px; }
      .dots { display: inline-flex; gap: 6px; align-items: center; height: 18px; }
      .dots span { width: 6px; height: 6px; background: #6d28d9; border-radius: 50%; animation: blink 1.2s infinite ease-in-out; }
      .dots.big span { width: 8px; height: 8px; }
      .dots span:nth-child(2) { animation-delay: 0.15s; }
      .dots span:nth-child(3) { animation-delay: 0.3s; }
      @keyframes blink { 0%, 80%, 100% { opacity: 0.2 } 40% { opacity: 1 } }
    `}</style>
  )
}
