import AppHero from '../components/AppHero'
import QuickGuide from '../components/QuickGuide'
import FomoFeed from '../components/FomoFeed'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'

export default function Chat() {
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(null) // null=checking, true/false=result
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const PAYHIP_URL = 'https://hypnoticmeditations.ai/b/U7Z5m' // <-- change to real product URL

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

  // auto-scroll
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
        <h1>Manifestation Genie</h1>
        <div className="sub">Welcome, {session.user.email}</div>
      </header>
return (
  <main className="max-w-3xl mx-auto px-4">
    <AppHero />         {/* headline + subhead */}
    {/* your existing chat box code stays here */}
    <QuickGuide />      {/* steps under chat */}
    <FomoFeed />        {/* rotating proof messages */}
  </main>
)

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

      <Style />
    </div>
  )
}

function LoaderScreen({ text }) {
  return (
    <div className="wrap">
      <div className="card center">
        <div className="dots big"><span/><span/><span/></div>
        <p style={{ marginTop: 12 }}>{text}</p>
      </div>
      <Style />
    </div>
  )
}

function Style() {
  return (
    <style jsx global>{`
      :root{
        --brand:#a78bfa;        /* violet */
        --brand-2:#22d3ee;      /* cyan   */
        --me:#8b5cf6;           /* user bubble start */
        --genie:rgba(17,24,39,.6);
        --card:rgba(10,12,26,.7);
        --soft:rgba(255,255,255,.12);
        --muted:rgba(255,255,255,.7);
        --text:#e7e9ff;
      }

      /* animated gradient background */
      body{
        margin:0; color:var(--text); font-family:Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
        background:
          radial-gradient(1200px 600px at 20% -10%, rgba(167,139,250,.35), transparent 60%),
          radial-gradient(1000px 500px at 120% 20%, rgba(34,211,238,.30), transparent 60%),
          linear-gradient(180deg, #0b0c18 0%, #0a0c1f 100%);
        background-attachment: fixed;
      }
      @keyframes floatGrad { 0%{filter:hue-rotate(0deg)} 100%{filter:hue-rotate(20deg)} }
      body::before{
        content:""; position:fixed; inset:-50%; pointer-events:none; z-index:-1;
        background:radial-gradient(650px 350px at 70% 10%, rgba(34,211,238,.12), transparent 60%),
                   radial-gradient(550px 300px at 10% 90%, rgba(167,139,250,.10), transparent 60%);
        animation: floatGrad 8s ease-in-out infinite alternate;
      }

      .wrap{max-width:920px;margin:28px auto 40px;padding:0 16px}
      .hero{margin:8px 0 16px;text-align:center}
      .hero h1{
        margin:0;font-size:34px;letter-spacing:0.2px;
        background:linear-gradient(90deg,var(--brand),var(--brand-2));
        -webkit-background-clip:text;background-clip:text;color:transparent;
        text-shadow:0 0 18px rgba(34,211,238,.18);
      }
      .hero h1 span{opacity:.85}
      .sub{color:var(--muted);margin-top:6px;font-size:14px}

      .card{
        background:var(--card);
        border:1px solid var(--soft);
        border-radius:16px;
        box-shadow:0 10px 30px rgba(0,0,0,.25);
        padding:24px;
      }
      .center{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:50vh;text-align:center}
      .btn{
        display:inline-block;margin-top:10px;padding:10px 14px;border-radius:10px;font-weight:600;text-decoration:none;
        background:linear-gradient(90deg,var(--brand),var(--brand-2)); color:#0b0c18;
        border:0;
      }

      .chatCard{
        background:linear-gradient(180deg, rgba(18,20,44,.9), rgba(10,12,32,.9));
        border:1px solid var(--soft);
        border-radius:16px;
        box-shadow:0 10px 30px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.03);
        overflow:hidden;
        backdrop-filter: blur(6px);
      }

      .list{height:56vh;min-height:300px;overflow-y:auto;padding:14px 12px 0;}

      .row{display:flex;gap:10px;margin:10px 6px}
      .row.me{justify-content:flex-end}
      .row .avatar{
        width:28px;height:28px;display:flex;align-items:center;justify-content:center;
        background:#1d1f33;border:1px solid var(--soft);border-radius:50%;flex:0 0 28px;font-size:14px
      }
      .row.me .avatar{order:2}

      .bubble{max-width:72%;padding:10px 12px;border-radius:14px;line-height:1.45}
      .bubble.user{
        background:linear-gradient(180deg,var(--me),#6d28d9);
        color:#fff; box-shadow:0 6px 18px rgba(139,92,246,.22), inset 0 0 0 1px rgba(255,255,255,.06);
      }
      .bubble.assistant{
        background:linear-gradient(180deg, rgba(20,25,54,.9), rgba(13,17,39,.9));
        border:1px solid var(--soft);
        box-shadow:0 6px 18px rgba(34,211,238,.1), inset 0 0 0 1px rgba(255,255,255,.03);
      }
      .tag{font-size:11px;opacity:.7;margin-bottom:4px}
      .msg{white-space:pre-wrap}

      .composer{
        display:flex;gap:10px;padding:12px;border-top:1px solid var(--soft);position:sticky;bottom:0;
        background:linear-gradient(180deg, rgba(10,12,30,.92), rgba(8,10,24,.92)); backdrop-filter: blur(8px);
      }
      .composer textarea{
        flex:1;resize:none;border:1px solid var(--soft);background:#0f1022;color:var(--text);
        border-radius:10px;padding:10px 12px;font-family:inherit;outline:none
      }
      .composer button{
        background:linear-gradient(90deg,var(--brand),var(--brand-2));
        color:#0b0c18;border:0;border-radius:10px;padding:10px 16px;cursor:pointer;font-weight:600
      }
      .composer button:disabled{opacity:.7;cursor:default}

      .bottomBar{display:flex;justify-content:flex-end;margin-top:10px}
      .ghost{background:transparent;color:var(--muted);border:1px solid var(--soft);padding:8px 12px;border-radius:10px;cursor:pointer}

      .dots{display:inline-flex;gap:6px;align-items:center;height:18px}
      .dots span{width:6px;height:6px;border-radius:50%;background:var(--brand);animation:blink 1.2s infinite ease-in-out}
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
