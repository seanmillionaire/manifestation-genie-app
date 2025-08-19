// pages/chat.js
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'
import GenieFlow from '../components/GenieFlow'

export default function Chat() {
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(null) // null=checking, true/false=result

  // wizard gate
  const [hasName, setHasName] = useState(false)
  const [checkingName, setCheckingName] = useState(true)
  const [wizardDone, setWizardDone] = useState(false)

  // chat state (your original)
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const PAYHIP_URL = 'https://hypnoticmeditations.ai/b/U7Z5m' // <-- change to real product URL

  const listRef = useRef(null)
  const inputRef = useRef(null)

  // --- FOMO ticker ---
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
    const t = setInterval(() => { if (!fomoPaused.current) setFomoIdx(i => (i+1)%FOMO_MESSAGES.length) }, 4000)
    return () => clearInterval(t)
  }, [])

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
      const { data, error } = await supabase.from('allowlist').select('status').eq('email', session.user.email).maybeSingle()
      if (error) { console.error(error); setAllowed(false) } else { setAllowed(data?.status === 'active') }
    }
    run()
  }, [session])

  // --- name check (Step 1 gate) ---
  useEffect(() => {
    async function run() {
      if (!session?.user?.id) return
      const { data } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
      setHasName(!!(data?.full_name && data.full_name.trim().length > 0))
      setCheckingName(false)
    }
    run()
  }, [session])

  // auto-scroll chat
  useEffect(() => {
    const el = listRef.current; if (!el) return; el.scrollTop = el.scrollHeight
  }, [messages, sending])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit() }
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await r.json()
      setMessages([...next, { role: 'assistant', content: data.reply || '…' }])
    } catch (err) {
      console.error(err)
      setMessages([...next, { role: 'assistant', content: 'Error contacting Manifestation Genie.' }])
    } finally {
      setSending(false); inputRef.current?.focus()
    }
  }

  // ---------- inline Name Step (Step 1) ----------
  function NameStep() {
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
      setHasName(!!(name && name.trim()))
    }

    if (loading) return <div className="panel"><div className="panelTitle">Display Name</div>Loading…</div>
    return (
      <section className="panel">
        <h2 className="panelTitle">Step 1 — Display Name</h2>
        <div style={{display:'flex', gap:8}}>
          <input
            value={name}
            onChange={(e)=>setName(e.target.value)}
            placeholder="Your name (used by the Genie)"
            style={{flex:1, background:'#0f1022', border:'1px solid var(--soft)', color:'var(--text)', borderRadius:10, padding:'10px 12px'}}
          />
          <button className="ghost" onClick={save} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save & Continue'}
          </button>
        </div>
      </section>
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
  if (allowed === null || checkingName) return <LoaderScreen text="Preparing your Genie…" />
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
      {/* HEADER */}
      <header className="hero">
        <h1>Manifestation Genie</h1>
        <p className="sub">Your AI Assistant for Turning Goals into Reality</p>
        <p className="sub small">👋 Welcome back, {session.user.email}.</p>
      </header>

      {/* STEP 1: NAME */}
      {!hasName && <NameStep />}

      {/* STEP 2: WIZARD (only after name is saved; chat locked until done) */}
      {hasName && !wizardDone && (
        <section className="panel">
          <h2 className="panelTitle">Step 2 — Today’s Genie Flow</h2>
          <GenieFlow session={session} onDone={()=>setWizardDone(true)} />
          <div style={{marginTop:10, fontSize:12, color:'var(--muted)'}}>
            Complete the flow to unlock the chat console.
          </div>
        </section>
      )}

      {/* AFTER: CHAT CONSOLE */}
      {hasName && wizardDone && (
        <>
          <div className="panel">
            <h2 className="panelTitle">Chat with the Genie</h2>
            <div className="chatCard" style={{marginTop:0}}>
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
                        <span /><span /><span />
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
          </div>

          {/* QUICK GUIDE */}
          <section className="panel">
            <h2 className="panelTitle">How to Use Manifestation Genie</h2>
            <div className="steps">
              <div className="step"><span>✨</span><div><b>Ask</b><div className="muted">Tell the Genie what you need next.</div></div></div>
              <div className="step"><span>🎯</span><div><b>Receive</b><div className="muted">Get one clear action with context.</div></div></div>
              <div className="step"><span>🚀</span><div><b>Act</b><div className="muted">Ship it. Check it off. Repeat daily.</div></div></div>
            </div>
            <div className="micro">Small actions compound into big manifestations.</div>
          </section>
        </>
      )}

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
        <div className="dots big"><span /><span /><span /></div>
        <p style={{ marginTop: 12 }}>{text}</p>
      </div>
      <Style />
    </div>
  )
}

function Style() {
  return (
    <style jsx global>{`
      body {
        margin: 0;
        font-family: Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        background: #ffffff;
        color: #000000;
      }

      .wrap {
        max-width: 720px;
        margin: 40px auto;
        padding: 0 16px;
      }

      .hero {
        text-align: center;
        margin-bottom: 24px;
      }
      .hero h1 {
        margin: 0;
        font-size: 36px;
        font-weight: 800;
        color: #000;
      }
      .sub {
        color: #333;
        margin-top: 8px;
        font-size: 16px;
      }
      .sub.small {
        font-size: 14px;
        color: #666;
      }

      .card, .panel, .chatCard {
        background: #fff;
        border: 2px solid #000;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
      }

      .panelTitle {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 700;
        color: #000;
        text-transform: uppercase;
      }

      .btn, .ghost, .composer button {
        background: #000;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 10px 16px;
        font-weight: 600;
        cursor: pointer;
      }
      .ghost {
        background: transparent;
        border: 2px solid #000;
        color: #000;
      }

      .composer {
        display: flex;
        gap: 10px;
        margin-top: 12px;
      }
      .composer textarea {
        flex: 1;
        border: 2px solid #000;
        border-radius: 8px;
        padding: 10px;
        font-size: 14px;
      }

      .list {
        max-height: 300px;
        overflow-y: auto;
        margin-bottom: 12px;
      }

      .row {
        display: flex;
        align-items: flex-start;
        margin-bottom: 12px;
        gap: 8px;
      }
      .bubble {
        border: 2px solid #000;
        border-radius: 8px;
        padding: 10px;
        background: #f9f9f9;
        color: #000;
        max-width: 75%;
      }
      .bubble.user {
        background: #000;
        color: #fff;
      }
      .avatar {
        font-size: 20px;
      }
      .tag {
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      .steps {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .step {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .step span {
        font-size: 18px;
      }

      .fomo {
        font-size: 14px;
        font-weight: 600;
        text-align: center;
      }
    `}</style>
  )
}

