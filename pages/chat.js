import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'

export default function Chat() {
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(null) // null=checking, true/false=result
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const PAYHIP_URL = 'https://hypnoticmeditations.ai/b/U7Z5m' // <-- change to your real Payhip product URL

  // refs
  const listRef = useRef(null)
  const inputRef = useRef(null)

  // --- auth session ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // --- allowlist check by email ---
  useEffect(() => {
    async function run() {
      if (!session?.user?.email) return
      const { data, error } = await supabase
        .from('allowlist')
        .select('status')
        .eq('email', session.user.email)
        .maybeSingle()
      if (error) {
        console.error(error)
        setAllowed(false)
      } else {
        setAllowed(data?.status === 'active')
      }
    }
    run()
  }, [session])

  // auto-scroll on new messages / typing state
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, sending])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    const input = e.target.prompt.value.trim()
    if (!input) return

    const next = [...messages, { role: 'user', content: input }]
    setMessages(next)
    e.target.reset()

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
      console.error(err)
      setMessages([...next, { role: 'assistant', content: 'Error contacting Genie.' }])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  if (!session) {
    return (
      <div className="wrap">
        <div className="card center">
          <p>Not logged in.</p>
          <a className="btn" href="/login">Go to Login</a>
        </div>
        <Style />
      </div>
    )
  }

  if (allowed === null) return <LoaderScreen text="Checking access…" />

  if (!allowed) {
    return (
      <div className="wrap">
        <div className="card center">
          <h2>Access inactive</h2>
          <p>Your email isn’t active for Manifestation Genie.</p>
          <a className="btn" href={PAYHIP_URL}>Get Access</a>
        </div>
        <Style />
      </div>
    )
  }

  return (
    <div className="wrap">
      <header className="hero">
        <h1><span>Manifestation</span> Genie</h1>
        <div className="sub">Welcome, {session.user.email}</div>
      </header>

      <div className="chatCard">
        <div className="list" ref={listRef}>
          {messages.map((m, i) => (
            <div key={i} className={`row ${m.role === 'user' ? 'me' : 'genie'}`}>
              <div className="avatar">{m.role === 'user' ? '🧑' : '🔮'}</div>
              <div className={`bubble ${m.role}`}>
                <div className="tag">{m.role === 'user' ? 'You' : 'Genie'}</div>
                <div className="msg">{m.content}</div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="row genie">
              <div className="avatar">🔮</div>
              <div className="bubble assistant">
                <div className="tag">Genie</div>
                <div className="dots"><span/><span/><span/></div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="composer">
          <textarea
            ref={inputRef}
            name="prompt"
            placeholder="Type your message… (Shift+Enter for a newline)"
            rows={2}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send'}</button>
        </form>
      </div>

      <div className="bottomBar">
        <button className="ghost" onClick={() => supabase.au
