// pages/chat.js
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'
import GenieFlow from '../components/GenieFlow'

function todayStr() {
  return new Date().toISOString().slice(0,10)
}

export default function Chat() {
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(null) // null=checking

  // profile (greeting)
  const [profile, setProfile] = useState(null)
  const firstName = ((profile?.full_name || '').trim().split(' ')[0]) || null
  const userName = firstName || session?.user?.email || 'Friend'

  // gates persisted in localStorage (so focus/login changes don’t reset)
  const [hasName, setHasName] = useState(false)
  const [checkingName, setCheckingName] = useState(true)
  const [wizardDone, setWizardDone] = useState(false)

  // chat
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  // resume helpers
  const [bootGreeted, setBootGreeted] = useState(false)

  // single FOMO line
  const [todayCount, setTodayCount] = useState(null)

  const PAYHIP_URL = 'https://hypnoticmeditations.ai/b/U7Z5m' // update for prod if needed

  // -------- load session + persisted gates on mount --------
  useEffect(() => {
    const boot = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session || null)
      const uid = session?.user?.id
      const dateKey = todayStr()
      if (uid) {
        const nameKey = `mg_hasName_${uid}`
        const wizKey  = `mg_wizardDone_${uid}_${dateKey}`
        if (localStorage.getItem(nameKey) === 'true') setHasName(true)
        if (localStorage.getItem(wizKey)  === 'true') setWizardDone(true)
      }
    }
    boot()
  }, [])

  // -------- auth listener (ignore token refresh) --------
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const currentUid = session?.user?.id
      const nextUid = nextSession?.user?.id
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setHasName(false)
        setWizardDone(false)
        setProfile(null)
        setMessages([])
        setBootGreeted(false)
        return
      }
      if (event === 'SIGNED_IN' && currentUid !== nextUid) {
        setSession(nextSession)
        const nameKey = `mg_hasName_${nextUid}`
        const wizKey  = `mg_wizardDone_${nextUid}_${todayStr()}`
        setHasName(localStorage.getItem(nameKey) === 'true')
        setWizardDone(localStorage.getItem(wizKey)  === 'true')
        setMessages([])
        setBootGreeted(false)
      }
      // Ignore TOKEN_REFRESHED / USER_UPDATED
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  // -------- allowlist --------
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!session?.user?.email) return
      const { data, error } = await supabase
        .from('allowlist').select('status')
        .eq('email', session.user.email).maybeSingle()
      if (!cancelled) setAllowed(error ? false : data?.status === 'active')
    }
    run()
    return () => { cancelled = true }
  }, [session?.user?.email])

  // -------- load profile full_name (used for greeting) --------
  useEffect(() => {
    let cancelled = false
    async function fetchProfile() {
      if (!session?.user?.id) return
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!cancelled) setProfile(data || null)
    }
    fetchProfile()
    return () => { cancelled = true }
  }, [session?.user?.id])

  // -------- name gate: only set TRUE, never auto‑flip to false --------
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!session?.user?.id) return
      if (hasName) { setCheckingName(false); return }
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .maybeSingle()
      if (cancelled) return
      const ok = !!(data?.full_name && data.full_name.trim().length > 0)
      setHasName(ok)
      if (ok) localStorage.setItem(`mg_hasName_${session.user.id}`, 'true')
      setCheckingName(false)
    }
    run()
    return () => { cancelled = true }
  }, [session?.user?.id, hasName])

  // -------- one‑line FOMO (count daily_entries for today) --------
  useEffect(() => {
    let cancelled = false
    async function fetchCount() {
      const { count, error } = await supabase
        .from('daily_entries')
        .select('user_id', { count: 'exact', head: true })
        .eq('entry_date', todayStr())
      if (!cancelled && !error) setTodayCount(count ?? 0)
    }
    fetchCount()
    return () => { cancelled = true }
  }, [])

  // chat autoscroll
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
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
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Error contacting Manifestation Genie.' }])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  // ---------- Step 1: Name ----------
  function NameStep() {
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
      let cancelled = false
      if (!session?.user) return
      ;(async () => {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .maybeSingle()
        if (cancelled) return
        setName(data?.full_name || '')
        setLoading(false)
      })()
      return () => { cancelled = true }
    }, [session?.user?.id])

    async function save() {
      if (!session?.user?.id) return
      setSaving(true)
      await supabase
        .from('profiles')
        .upsert({ id: session.user.id, full_name: name || null })
      setSaving(false)
      const ok = !!(name && name.trim())
      if (ok) {
        setHasName(true)
        setProfile({ full_name: name }) // update greeting immediately
        localStorage.setItem(`mg_hasName_${session.user.id}`, 'true')
      }
    }

    if (loading) return <div className="card">Loading…</div>
    return (
      <section className="card">
        <h2 className="panelTitle">Step 1 — Your Name</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (used by the Genie)"
            className="textInput"
          />
        <button type="button" className="btn" onClick={save} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save & Continue'}
          </button>
        </div>
      </section>
    )
  }

  // ---------- Greet & Resume on every login ----------
  useEffect(() => {
    async function primeGreeting() {
      if (!session?.user?.id) return
      if (bootGreeted) return

      // Always greet by name/email
      let greeting = `👋 Welcome back, ${userName}. `

      // Fetch today state to decide what to say
      const today = todayStr()
      const [{ data: intentRow }, { data: stepsRows }] = await Promise.all([
        supabase.from('daily_intents').select('intent, idea').eq('user_id', session.user.id).eq('entry_date', today).maybeSingle(),
        supabase.from('action_steps').select('step_order,label,completed').eq('user_id', session.user.id).eq('entry_date', today).order('step_order', { ascending: true })
      ])

      const steps = stepsRows || []
      const firstIncomplete = steps.find(s => !s.completed)

      let body
      if (!hasName) {
        body = `Let’s start with your name so the Genie can personalize everything.`
      } else if (!wizardDone) {
        body = `Ready to pick up today’s quick setup? I’ll guide you one question at a time.`
      } else if (firstIncomplete) {
        body = `We paused at Step ${firstIncomplete.step_order}: “${firstIncomplete.label}”. Want to continue now?`
      } else if (steps.length > 0) {
        body = `Nice work earlier — you finished all of today’s steps. Want to reflect or start a new intent?`
      } else if (intentRow?.intent) {
        body = `Your intent is “${intentRow.intent}”. I can generate or refine a plan when you're ready.`
      } else {
        body = `Want me to kick off today’s flow for you?`
      }

      setMessages([{ role: 'assistant', content: `${greeting}${body}` }])
      setBootGreeted(true)
    }
    // We re‑prime whenever these change and haven’t greeted yet
    primeGreeting()
  }, [session?.user?.id, userName, hasName, wizardDone, bootGreeted])

  // ---------- auth/allowlist gates ----------
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
  if (allowed === null || checkingName) return <Loader text="Preparing your Genie…" />
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

  // persist wizard completion when fired
  function handleWizardDone() {
    const uid = session?.user?.id
    if (uid) localStorage.setItem(`mg_wizardDone_${uid}_${todayStr()}`, 'true')
    setWizardDone(true)
    // re‑prime the greeting after finishing setup, so chat has a resume message
    setBootGreeted(false)
  }

  return (
    <div className="wrap">
      <header className="hero">
        <h1>Manifestation Genie</h1>
        <p className="sub">Your AI Assistant for Turning Goals into Reality</p>
        <p className="sub small">✨ Welcome back, {userName}.</p>
      </header>

      {!hasName && <NameStep />}

      {hasName && !wizardDone && (
        <section className="card">
          <h2 className="panelTitle">Step 2 — Today’s Genie Flow</h2>
          <GenieFlow session={session} onDone={handleWizardDone} />
          <div className="microNote">Complete the flow to unlock the chat console.</div>
        </section>
      )}

      {hasName && wizardDone && (
        <section className="card">
          <h2 className="panelTitle">Chat with the Genie</h2>
          <div className="list" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`row ${m.role === 'user' ? 'me' : ''}`}>
                <div className="avatar">{m.role === 'user' ? '🧑' : '🔮'}</div>
                <div className={`bubble ${m.role === 'user' ? 'user' : ''}`}>
                  <div className="tag">{m.role === 'user' ? 'You' : 'Manifestation Genie'}</div>
                  <div className="msg">{m.content}</div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="row">
                <div className="avatar">🔮</div>
                <div className="bubble">
                  <div className="tag">Manifestation Genie</div>
                  <div className="dots"><span /><span /><span /></div>
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
              className="textArea"
            />
            <button type="submit" className="btn" disabled={sending}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </form>
        </section>
      )}

      <div className="fomoLine">
        {todayCount !== null && <>🔥 {todayCount} people used Manifestation Genie today</>}
      </div>

      <div className="bottomRight">
        <button type="button" className="ghost" onClick={() => supabase.auth.signOut()}>Logout</button>
      </div>

      <Style />
    </div>
  )
}

function Loader({ text }) {
  return (
    <div className="wrap">
      <div className="card center">
        <div className="dots"><span /><span /><span /></div>
        <p style={{ marginTop: 12 }}>{text}</p>
      </div>
      <Style />
    </div>
  )
}

function Style() {
  return (
    <style jsx global>{`
      html, body, #__next { margin:0; padding:0; background:#fff; color:#000; min-height:100%; }
      * { box-sizing: border-box; }

      .wrap { max-width: 760px; margin: 36px auto 48px; padding: 0 16px; }

      .hero { text-align: center; margin-bottom: 24px; }
      .hero h1 { margin:0; font-size: 36px; font-weight: 900; color:#000; }
      .sub { margin-top: 8px; font-size: 16px; color:#111; }
      .sub.small { font-size: 14px; color:#444; }

      .card {
        background:#fff;
        color:#000;
        border:2px solid #000;
        border-radius:12px;
        padding:20px;
        margin-bottom:20px;
      }

      .panelTitle { margin:0 0 10px 0; font-size:16px; font-weight:800; text-transform:uppercase; }
      .microNote { margin-top:8px; font-size:12px; color:#444; }

      .textInput, .textArea {
        border:2px solid #000;
        border-radius:8px;
        padding:10px 12px;
        font-size:14px;
        background:#fff;
        color:#000;
        outline:none;
      }
      .textInput { width:100%; }
      .textArea { flex:1; }

      .btn {
        background:#000;
        color:#fff;
        border:2px solid #000;
        border-radius:8px;
        padding:10px 16px;
        font-weight:800;
        cursor:pointer;
      }
      .btn:disabled { opacity:.7; cursor:default; }

      .ghost {
        background:#fff;
        color:#000;
        border:2px solid #000;
        border-radius:8px;
        padding:8px 12px;
        font-weight:800;
        cursor:pointer;
      }

      .list { max-height: 320px; overflow-y: auto; margin-bottom: 12px; }
      .row { display:flex; gap:10px; margin:12px 6px; }
      .row.me { justify-content: flex-end; }
      .avatar { font-size: 20px; }

      .bubble {
        max-width: 75%;
        padding: 10px 12px;
        border: 2px solid #000;
        border-radius: 10px;
        background: #f6f6f6;
        color: #000;
      }
      .bubble.user { background:#000; color:#fff; }

      .tag { font-size: 12px; font-weight: 700; margin-bottom: 4px; opacity:.85; }
      .msg { white-space: pre-wrap; }

      .composer { display:flex; gap:10px; align-items:flex-end; }

      .dots { display:inline-flex; gap:6px; align-items:center; }
      .dots span { width:6px; height:6px; background:#000; border-radius:50%; opacity:.25; animation: blink 1.2s infinite ease-in-out; }
      .dots span:nth-child(2){ animation-delay:.15s }
      .dots span:nth-child(3){ animation-delay:.3s }
      @keyframes blink { 0%,80%,100%{opacity:.25} 40%{opacity:1} }

      .fomoLine { text-align:center; font-weight:800; margin: 16px 0; }

      .bottomRight { display:flex; justify-content:flex-end; }
      .center { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:40vh; text-align:center; }
    `}</style>
  )
}
