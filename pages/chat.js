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

  // ----- gates persisted in localStorage (stable across focus changes) -----
  const [hasName, setHasName] = useState(false)
  const [checkingName, setCheckingName] = useState(true)
  const [wizardDone, setWizardDone] = useState(false)

const [profile, setProfile] = useState(null)

useEffect(() => {
  const fetchProfile = async () => {
    if (!session?.user?.id) return
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", session.user.id)
      .single()
    if (data) setProfile(data)
  }
  fetchProfile()
}, [session])

const userName = profile?.full_name || session?.user?.email || "Friend"

  
  // chat
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  // single FOMO line
  const [todayCount, setTodayCount] = useState(null)

  const PAYHIP_URL = 'https://hypnoticmeditations.ai/b/U7Z5m' // change for prod

  // ----- load persisted gates on mount -----
  useEffect(() => {
    const boot = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session || null)

      const uid = session?.user?.id
      const dateKey = todayStr()
      if (uid) {
        // Persisted name flag
        const nameKey = `mg_hasName_${uid}`
        const persistedName = localStorage.getItem(nameKey)
        if (persistedName === 'true') setHasName(true)

        // Persisted wizard completion (per day)
        const wizKey = `mg_wizardDone_${uid}_${dateKey}`
        const persistedWiz = localStorage.getItem(wizKey)
        if (persistedWiz === 'true') setWizardDone(true)
      }
    }
    boot()
  }, [])

  // ----- auth listener (IGNORE token refresh noise) -----
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Only react if the user actually changed (prevents “restart on focus”)
      const currentUid = session?.user?.id
      const nextUid = nextSession?.user?.id
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setHasName(false)
        setWizardDone(false)
        return
      }
      if (event === 'SIGNED_IN') {
        if (currentUid !== nextUid) {
          setSession(nextSession)
          // reload persisted flags for the new user
          const nameKey = `mg_hasName_${nextUid}`
          const wizKey = `mg_wizardDone_${nextUid}_${todayStr()}`
          if (localStorage.getItem(nameKey) === 'true') setHasName(true)
          if (localStorage.getItem(wizKey) === 'true') setWizardDone(true)
        }
      }
      // Ignore TOKEN_REFRESHED / USER_UPDATED / etc.
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  // ----- allowlist (one shot per user/email) -----
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!session?.user?.email) return
      const { data, error } = await supabase
        .from('allowlist')
        .select('status')
        .eq('email', session.user.email)
        .maybeSingle()
      if (!cancelled) setAllowed(error ? false : data?.status === 'active')
    }
    run()
    return () => { cancelled = true }
  }, [session?.user?.email])

  // ----- name gate: only set TRUE, never auto‑flip to false on focus -----
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!session?.user?.id) return
      // if we already have it from localStorage, don't flip‑flop
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

  // ----- one‑line FOMO (count daily_entries for today) -----
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
    if (uid) {
      localStorage.setItem(`mg_wizardDone_${uid}_${todayStr()}`, 'true')
    }
    setWizardDone(true)
  }

  return (
    <div className="wrap">
      <header className="hero">
        <h1>Manifestation Genie</h1>
        <p className="sub">Your AI Assistant for Turning Goals into Reality</p>
        <p className="sub small">👋 Welcome back, {session.user.email}.</p>
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
    `}</style>
  )
}
