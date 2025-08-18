// pages/chat.js
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'

export default function Chat() {
  // --- state & refs (make sure these exist) ---
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(null)
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState(null)

  const inputRef = useRef(null)
  const listRef  = useRef(null)   // 👈 this was missing in your version

  const PAYHIP_URL = 'https://hypnoticmeditations.ai/b/U7Z5m' // TODO: set your link

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

  // --- create/reuse chat session; then load history ---
  useEffect(() => {
    async function bootstrap() {
      if (!allowed || !session?.user?.id) return
      const userId = session.user.id

      // reuse latest session
      const { data: found } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let sid = found?.id
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

  // --- auto scroll ---
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, sending])

  // --- send message ---
  async function handleSend(e) {
    e.preventDefault()
    const input = inputRef.current.value.trim()
    if (!input || sending || !sessionId || !session?.user?.id) return

    const next = [...messages, { role: 'user', content: input }]
    setMessages(next)
    inputRef.current.value = ''
    setSending(true)

    // persist user message
    await supabase.from('messages').insert([{
      session_id: sessionId,
      user_id: session.user.id,
      role: 'user',
      content: input
    }])

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next })
      })
      const data = await r.json()
      const reply = data.reply || '…'

      const final = [...next, { role: 'assistant', content: reply }]
      setMessages(final)

      // persist assistant message
      await supabase.from('messages').insert([{
        session_id: sessionId,
        user_id: session.user.id,
        role: 'assistant',
        content: reply
      }])
    } catch (err) {
      console.error(err)
      setMessages([...messages, { role: 'assistant', content: 'Error contacting Genie.' }])
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

  // ---- main UI ----
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
