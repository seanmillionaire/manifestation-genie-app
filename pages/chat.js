import { useEffect, useState } from 'react'
import { supabase } from '../src/supabaseClient'

export default function Chat() {
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(null) // null=checking, true/false=result
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const PAYHIP_URL = 'https://hypnoticmeditations.ai/b/U7Z5m' // <-- change to your real Payhip product URL

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

  async function handleSend(e) {
    e.preventDefault()
    const input = e.target.prompt.value.trim()
    if (!input) return

    // 1) show your message
    const next = [...messages, { role: 'user', content: input }]
    setMessages(next)
    e.target.reset()

    // 2) ask the server
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
    }
  }

  if (!session) {
    return (
      <div style={{ padding: 20 }}>
        <p>Not logged in.</p>
        <a href="/login">Go to Login</a>
      </div>
    )
  }

  if (allowed === null) return <div style={{ padding: 20 }}>Checking access…</div>

  if (!allowed) {
    return (
      <div style={{ padding: 20, fontFamily: 'Inter, system-ui' }}>
        <h2>Access inactive</h2>
        <p>Your email isn’t active for Manifestation Genie.</p>
        <a href={PAYHIP_URL}>Get Access</a>
      </div>
    )
  }

  import { useEffect, useState } from 'react'
import { supabase } from '../src/supabaseClient'

export default function Chat() {
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(null) // null=checking, true/false=result
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const PAYHIP_URL = 'https://hypnoticmeditations.ai/b/U7Z5m' // <-- change to your real Payhip product URL

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

  async function handleSend(e) {
    e.preventDefault()
    const input = e.target.prompt.value.trim()
    if (!input) return

    // 1) show your message
    const next = [...messages, { role: 'user', content: input }]
    setMessages(next)
    e.target.reset()

    // 2) ask the server
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
    }
  }

  if (!session) {
    return (
      <div style={{ padding: 20 }}>
        <p>Not logged in.</p>
        <a href="/login">Go to Login</a>
      </div>
    )
  }

  if (allowed === null) return <div style={{ padding: 20 }}>Checking access…</div>

  if (!allowed) {
    return (
      <div style={{ padding: 20, fontFamily: 'Inter, system-ui' }}>
        <h2>Access inactive</h2>
        <p>Your email isn’t active for Manifestation Genie.</p>
        <a href={PAYHIP_URL}>Get Access</a>
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
        <button className="ghost" onClick={() => supabase.auth.signOut()}>Logout</button>
      </div>

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
      /* page theme pulled from _app.js, plus layout here */
      .wrap{max-width:920px;margin:28px auto 40px;padding:0 16px}
      .hero{margin:8px 0 16px;text-align:center}
      .hero h1{margin:0;font-size:34px;letter-spacing:0.2px;
        background:linear-gradient(90deg,#8b5cf6,#22d3ee);
        -webkit-background-clip:text;background-clip:text;color:transparent}
      .hero h1 span{opacity:.85}
      .sub{color:#a6a8bf;margin-top:6px;font-size:14px}

      .chatCard{
        background:#16172a;
        border:1px solid #21233a;
        border-radius:16px;
        box-shadow:0 10px 30px rgba(0,0,0,.25);
        overflow:hidden;
      }

      .list{height:56vh;min-height:300px;overflow-y:auto;padding:14px 12px 0;}

      .row{display:flex;gap:10px;margin:10px 6px}
      .row.me{justify-content:flex-end}
      .row .avatar{width:28px;height:28px;display:flex;align-items:center;justify-content:center;
        background:#1d1f33;border:1px solid #21233a;border-radius:50%;flex:0 0 28px;font-size:14px}
      .row.me .avatar{order:2}

      .bubble{max-width:72%;padding:10px 12px;border-radius:14px;line-height:1.45}
      .bubble.user{background:linear-gradient(180deg,#8b5cf6,#6d28d9);color:#fff}
      .bubble.assistant{background:#262842;border:1px solid #21233a}
      .tag{font-size:11px;opacity:.7;margin-bottom:4px}
      .msg{white-space:pre-wrap}

      .composer{display:flex;gap:10px;padding:12px;border-top:1px solid #21233a;position:sticky;bottom:0;background:#16172a}
      .composer textarea{
        flex:1;resize:none;border:1px solid #21233a;background:#0f1022;color:#e8e9f1;
        border-radius:10px;padding:10px 12px;font-family:inherit;outline:none
      }
      .composer button{
        background:linear-gradient(90deg,#8b5cf6,#22d3ee);
        color:#0b0c18;border:0;border-radius:10px;padding:10px 16px;cursor:pointer;font-weight:600
      }
      .composer button:disabled{opacity:.7;cursor:default}

      .bottomBar{display:flex;justify-content:flex-end;margin-top:10px}
      .ghost{background:transparent;color:#a6a8bf;border:1px solid #21233a;padding:8px 12px;border-radius:10px;cursor:pointer}

      .card{background:#16172a;border:1px solid #21233a;border-radius:12px;padding:16px}
      .card.center{text-align:center;padding:40px 16px}

      .dots{display:inline-flex;gap:6px;align-items:center;height:18px}
      .dots span{width:6px;height:6px;border-radius:50%;background:#8b5cf6;animation:blink 1.2s infinite ease-in-out}
      .dots.big span{width:8px;height:8px}
      .dots span:nth-child(2){animation-delay:.15s}
      .dots span:nth-child(3){animation-delay:.3s}
      @keyframes blink{0%,80%,100%{opacity:.25}40%{opacity:1}}

      @media (max-width:560px){
        .list{height:60vh}
        .bubble{max-width:80%}
      }
    `}</style>
  )
}
