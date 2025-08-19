// pages/chat.js
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'
import GenieFlow from '../components/GenieFlow'

export default function Chat() {
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(null) // null=checking, true/false=result
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const PAYHIP_URL = 'https://hypnoticmeditations.ai/b/U7Z5m' // <-- change to real product URL

  const listRef = useRef(null)
  const inputRef = useRef(null)

  // --- FOMO ticker (non-competitive) ---
  const FOMO_MESSAGES = [
    '🌍 4,327 people logged in to Manifestation Genie today.',
    '🔥 14,201 actions completed this week inside Manifestation Genie.',
    '🎯 James completed his 7‑day streak with Manifestation Genie.',
    '💡 Maria in California finished today’s Manifestation Genie action step.',
    '💰 Ashley celebrated paying off $1,000 using Manifestation Genie’s guidance.',
    '🧘 427 users finished a mindfulness prompt in Manifestation Genie today.',
    '🚀 David marked a 30‑day consistency streak in Manifestation Genie.',
    '✨ 93% of new users completed at least 1 action in Manifestation Genie this week.',
    '🎉 Sarah hit her first milestone: publishing her blog, tracked with Manifestation Genie.',
    '🌟 17,482 people took action through Manifestation Genie this month.',
  ]
  const [fomoIdx, setFomoIdx] = useState(0)
  const fomoPaused = useRef(false)

  useEffect(() => {
    const t = setInterval(() => {
      if (!fomoPaused.current) setFomoIdx((i) => (i + 1) % FOMO_MESSAGES.length)
    }, 4000)
    return () => clearInterval(t)
  }, [])

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
        body: JSON.stringify({ messages: next }),
      })
      const data = await r.json()
      setMessages([...next, { role: 'assistant', content: data.reply || '…' }])
    } catch (err) {
      console.error(err)
      setMessages([
        ...next,
        { role: 'assistant', content: 'Error contacting Manifestation Genie.' },
      ])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  // --- simple display name editor (WHERE #4 LIVES) ---
  // If you want this separate, move it into /pages/profile.jsx; keeping inline is simplest.
  function NameEditor() {
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    useEffect(() => {
      if (!session?.user) return
      ;(async () => {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
        setName(data?.full_name || '')
        setLoading(false)
      })()
    }, [session])

    async function save() {
      if (!session?.user) return
      setSaving(true)
      await supabase.from('profiles').upsert({ id: session.user.id, full_name: name || null })
      setSaving(false)
    }

    if (loading) return null
    return (
      <div className="panel" style={{marginTop:12}}>
        <h2 className="panelTitle">Display Name</h2>
        <div style={{display:'flex', gap:8}}>
          <input
            value={name}
            onChange={(e)=>setName(e.target.value)}
            placeholder="Your name (used by the Genie)"
            style={{flex:1, background:'#0f1022', border:'1px solid var(--soft)', color:'var(--text)', borderRadius:10, padding:'10px 12px'}}
          />
          <button className="ghost" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    )
  }

  // --- auth/allowlist gates ---
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

  // --- main UI ---
  return (
    <div className="wrap">
      {/* HEADER */}
      <header className="hero">
        <h1>Manifestation Genie</h1>
        <p className="sub">Your AI Assistant for Turning Goals into Reality</p>
        <p className="sub small">👋 Welcome back, {session.user.email}.</p>
      </header>

      {/* NAME EDITOR (#4) */}
      <NameEditor />

      {/* GENIE DAILY FLOW (new) */}
      <div className="panel">
        <h2 className="panelTitle">Today’s Genie Flow</h2>
        <GenieFlow session={session} />
      </div>

      {/* CHAT (your existing) */}
      <div className="chatCard">
        <div className="list" ref={listRef}>
          {messages.map((m, i) => (
            <div key={i} className={`row ${m.role === 'user' ? 'me' : 'genie'}`}>
              <div className="avatar">{m.role === 'user' ? '🧑' : '🔮'}</div>
              <div className={`bubble ${m.role}`}>
                <div className="tag">{m.role === 'user' ? 'You' : 'Manifestation Genie'}</div>
                <div className="msg">{m.content}</div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="row genie">
              <div className="avatar">🔮</div>
              <div className="bubble assistant">
                <div className="tag">Manifestation Genie</div>
                <div className="dots">
                  <span />
                  <span />
                  <span />
                </div>
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
          <button type="submit" disabled={sending}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </form>
      </div>

      {/* QUICK GUIDE */}
      <section className="panel">
        <h2 className="panelTitle">How to Use Manifestation Genie</h2>
        <div className="steps">
          <div className="step">
            <span>✨</span>
            <div>
              <b>Ask</b>
              <div className="muted">Type your goal, desire, or challenge.</div>
            </div>
          </div>
          <div className="step">
            <span>🎯</span>
            <div>
              <b>Receive</b>
              <div className="muted">Get a clear daily action — personalized for you.</div>
            </div>
          </div>
          <div className="step">
            <span>🚀</span>
            <div>
              <b>Act</b>
              <div className="muted">Complete the step, check it off, and track progress.</div>
            </div>
          </div>
        </div>
        <div className="micro">Check in daily — small actions compound into big manifestations.</div>
      </section>

      {/* FOMO TICKER */}
      <div
        className="panel fomo"
        onMouseEnter={() => (fomoPaused.current = true)}
        onMouseLeave={() => (fomoPaused.current = false)}
        aria-live="polite"
        role="status"
      >
        {FOMO_MESSAGES[fomoIdx]}
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
        <div className="dots big">
          <span />
          <span />
          <span />
        </div>
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
        --brand:#a78bfa; --brand-2:#22d3ee; --me:#8b5cf6; --genie:rgba(17,24,39,.6);
        --card:rgba(10,12,26,.7); --soft:rgba(255,255,255,.12); --muted:rgba(255,255,255,.7); --text:#e7e9ff;
      }
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
      .sub{color:var(--muted);margin-top:6px;font-size:14px}
      .sub.small{ font-size:13px; opacity:.75 }
      .card{background:var(--card); border:1px solid var(--soft); border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,.25); padding:24px;}
      .center{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:50vh;text-align:center}
      .btn{display:inline-block;margin-top:10px;padding:10px 14px;border-radius:10px;font-weight:600;text-decoration:none;
        background:linear-gradient(90deg,var(--brand),var(--brand-2)); color:#0b0c18; border:0;}
      .chatCard{background:linear-gradient(180deg, rgba(18,20,44,.9), rgba(10,12,32,.9));
        border:1px solid var(--soft); border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.03);
        overflow:hidden; backdrop-filter: blur(6px); margin-top:16px;}
      .list{height:56vh;min-height:300px;overflow-y:auto;padding:14px 12px 0;}
      .row{display:flex;gap:10px;margin:10px 6px}
      .row.me{justify-content:flex-end}
      .row .avatar{width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:#1d1f33;border:1px solid var(--soft);border-radius:50%;flex:0 0 28px;font-size:14px}
      .row.me .avatar{order:2}
      .bubble{max-width:72%;padding:10px 12px;border-radius:14px;line-height:1.45}
      .bubble.user{background:linear-gradient(180deg,var(--me),#6d28d9); color:#fff; box-shadow:0 6px 18px rgba(139,92,246,.22), inset 0 0 0 1px rgba(255,255,255,.06);}
      .bubble.assistant{background:linear-gradient(180deg, rgba(20,25,54,.9), rgba(13,17,39,.9)); border:1px solid var(--soft);
        box-shadow:0 6px 18px rgba(34,211,238,.1), inset 0 0 0 1px rgba(255,255,255,.03);}
      .tag{font-size:11px;opacity:.7;margin-bottom:4px}
      .msg{white-space:pre-wrap}
      .composer{display:flex;gap:10px;padding:12px;border-top:1px solid var(--soft);position:sticky;bottom:0;
        background:linear-gradient(180deg, rgba(10,12,30,.92), rgba(8,10,24,.92)); backdrop-filter: blur(8px);}
      .composer textarea{flex:1;resize:none;border:1px solid var(--soft);background:#0f1022;color:var(--text);
        border-radius:10px;padding:10px 12px;font-family:inherit;outline:none}
      .composer button{background:linear-gradient(90deg,var(--brand),var(--brand-2)); color:#0b0c18;border:0;border-radius:10px;padding:10px 16px;cursor:pointer;font-weight:600}
      .composer button:disabled{opacity:.7;cursor:default}
      .bottomBar{display:flex;justify-content:flex-end;margin-top:10px}
      .ghost{background:transparent;color:var(--muted);border:1px solid var(--soft);padding:8px 12px;border-radius:10px;cursor:pointer}
      .panel{margin-top:16px;background:var(--card);border:1px solid var(--soft);border-radius:16px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.20);}
      .panelTitle{margin:0 0 10px 0;font-size:14px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);}
      .steps{ display:grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap:12px; }
      .step{ display:flex; gap:10px; align-items:flex-start; }
      .step span{ font-size:18px; line-height:1; margin-top:2px }
      .muted{ color:var(--muted); font-size:13px; opacity:.9; }
      .micro{ margin-top:10px; color:var(--muted); font-size:12px; }
      .fomo{ font-size:14px; }
      @media (max-width:560px){
        .list{height:60vh}
        .bubble{max-width:80%}
        .steps{ grid-template-columns: 1fr; }
      }
    `}</style>
  )
}
