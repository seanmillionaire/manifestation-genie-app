// pages/chat.js — Spacious Layout Edition
import Questionnaire from '../components/Questionnaire'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'
import GenieFlow from '../components/GenieFlow'

const todayStr = () => new Date().toISOString().slice(0,10)
const HM_STORE_URL = 'https://hypnoticmeditations.ai'  // or your Payhip URL

export default function Chat() {
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(null)

  // profile
  const [profile, setProfile] = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const firstName = ((profile?.full_name || '').trim().split(' ')[0]) || null
  const userName = firstName || session?.user?.email || 'Friend'

  // gates
  const [hasName, setHasName] = useState(false)
  const [checkingName, setCheckingName] = useState(true)
  const [wizardDone, setWizardDone] = useState(false)

  // chat
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  // greet control
  const [bootGreeted, setBootGreeted] = useState(false)

  // fomo
  const [todayCount, setTodayCount] = useState(null)

  const PAYHIP_URL = 'https://hypnoticmeditations.ai/b/U7Z5m'

  // session + persisted gates
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session || null)
      const uid = session?.user?.id
      if (uid) {
        const nameKey = `mg_hasName_${uid}`
        const wizKey  = `mg_wizardDone_${uid}_${todayStr()}`
        if (localStorage.getItem(nameKey) === 'true') setHasName(true)
        if (localStorage.getItem(wizKey)  === 'true') setWizardDone(true)
      }
    })()
  }, [])

  // auth listener (ignore token refresh)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const cur = session?.user?.id
      const nxt = nextSession?.user?.id
      if (event === 'SIGNED_OUT') {
        setSession(null); setHasName(false); setWizardDone(false)
        setProfile(null); setProfileLoaded(false)
        setMessages([]); setBootGreeted(false)
        return
      }
      if (event === 'SIGNED_IN' && cur !== nxt) {
        setSession(nextSession)
        const nameKey = `mg_hasName_${nxt}`
        const wizKey  = `mg_wizardDone_${nxt}_${todayStr()}`
        setHasName(localStorage.getItem(nameKey) === 'true')
        setWizardDone(localStorage.getItem(wizKey)  === 'true')
        setProfile(null); setProfileLoaded(false)
        setMessages([]); setBootGreeted(false)
      }
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  // allowlist
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!session?.user?.email) return
      const { data, error } = await supabase
        .from('allowlist').select('status').eq('email', session.user.email).maybeSingle()
      if (!cancelled) setAllowed(error ? false : data?.status === 'active')
    })()
    return () => { cancelled = true }
  }, [session?.user?.email])

  // load profile (and mark loaded)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!session?.user?.id) return
      const { data } = await supabase
        .from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
      if (!cancelled) { setProfile(data || null); setProfileLoaded(true) }
    })()
    return () => { cancelled = true }
  }, [session?.user?.id])

  // name gate (only set TRUE; never flip back)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!session?.user?.id) return
      if (hasName) { setCheckingName(false); return }
      const { data } = await supabase
        .from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
      if (cancelled) return
      const ok = !!(data?.full_name && data.full_name.trim())
      setHasName(ok)
      if (ok) localStorage.setItem(`mg_hasName_${session.user.id}`, 'true')
      setCheckingName(false)
    })()
    return () => { cancelled = true }
  }, [session?.user?.id, hasName])

  // fomo
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { count, error } = await supabase
        .from('daily_entries').select('user_id', { count: 'exact', head: true })
        .eq('entry_date', todayStr())
      if (!cancelled && !error) setTodayCount(count ?? 0)
    })()
    return () => { cancelled = true }
  }, [])

  // chat scroll
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
  body: JSON.stringify({
    messages: next,
    userName,              // comes from your Supabase profile or fallback
    hmUrl: HM_STORE_URL,   // <- this is the Hypnotic Meditations store URL
  }),
})

      const data = await r.json()
      setMessages([...next, { role: 'assistant', content: data.reply || '…' }])
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Error contacting Manifestation Genie.' }])
    } finally {
      setSending(false); inputRef.current?.focus()
    }
  }

  // Step 1: Name
  function NameStep() {
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
      let cancelled = false
      ;(async () => {
        if (!session?.user?.id) return
        const { data } = await supabase
          .from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
        if (cancelled) return
        setName(data?.full_name || ''); setLoading(false)
      })()
      return () => { cancelled = true }
    }, [session?.user?.id])

    async function save() {
      if (!session?.user?.id) return
      setSaving(true)
      await supabase.from('profiles')
        .upsert({ id: session.user.id, full_name: name || null })
      setSaving(false)
      if (name.trim()) {
        setHasName(true)
        setProfile({ full_name: name })
        setProfileLoaded(true)
        localStorage.setItem(`mg_hasName_${session.user.id}`, 'true')
      }
    }

    if (loading) return <div className="card">Loading…</div>
    return (
      <section className="card">
        <h2 className="panelTitle">Step 1 — Your Name</h2>
        <div className="hStack">
          <input className="textInput" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" />
          <button type="button" className="btn" onClick={save} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save & Continue'}
          </button>
        </div>
      </section>
    )
  }

  // Greet after profile is loaded
  useEffect(() => {
    async function greet() {
      if (!session?.user?.id || !profileLoaded || bootGreeted) return

      const today = todayStr()
      const [{ data: intentRow }, { data: stepsRows }] = await Promise.all([
        supabase.from('daily_intents').select('intent').eq('user_id', session.user.id).eq('entry_date', today).maybeSingle(),
        supabase.from('action_steps').select('step_order,label,completed').eq('user_id', session.user.id).eq('entry_date', today).order('step_order', { ascending: true })
      ])

      const steps = stepsRows || []
      const firstIncomplete = steps.find(s => !s.completed)

      const hello = `👋 Welcome back, ${userName}. `
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

      setMessages([{ role: 'assistant', content: hello + body }])
      setBootGreeted(true)
    }
    greet()
  }, [session?.user?.id, profileLoaded, userName, hasName, wizardDone, bootGreeted])

  // gates
  if (!session) {
    return (
      <div className="wrap">
        <div className="card center"><p>Not logged in.</p><a className="btn" href="/login">Go to Login</a></div>
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

  function handleWizardDone() {
    const uid = session?.user?.id
    if (uid) localStorage.setItem(`mg_wizardDone_${uid}_${todayStr()}`, 'true')
    setWizardDone(true)
    setBootGreeted(false)
  }

  return (
    <div className="wrap">
      <header className="hero">
        <h1>Manifestation Genie</h1>
        <p className="sub">Your Personal AI Assistant for Turning Goals into Reality</p>
        <p className="sub small">✨ Welcome back, {userName}.</p>
      </header>

      {!hasName && <NameStep />}

      {hasName && !wizardDone && (
        <section className="card">
          <h2 className="panelTitle">Step 2 — Today’s Genie Flow</h2>
          <Questionnaire
    session={session}
    onDone={handleWizardDone}
  />

          <div className="microNote">Complete the flow to unlock the chat console.</div>
        </section>
      )}

      {hasName && wizardDone && (
        <section className="card chatCard">
          <h2 className="panelTitle">Chat with the Genie</h2>
          <div className="list" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`row ${m.role === 'user' ? 'me' : ''}`}>
                <div className="avatar">{m.role === 'user' ? '🫵' : '🧞‍♂️'}</div>
                <div className={`bubble ${m.role === 'user' ? 'user' : ''}`}>
                  <div className="tag">{m.role === 'user' ? 'You' : 'Manifestation Genie'}</div>
                  <div className="msg">{m.content}</div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="row">
                <div className="avatar">🧞‍♂️</div>
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
              rows={3}
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
       <p>🔥 108 people used Manifestation Genie today</p>
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

      /* ====== Layout spacing ====== */
      .wrap { max-width: 960px; margin: 64px auto 88px; padding: 0 24px; }

      .hero { text-align: center; margin-bottom: 40px; }
      .hero h1 { margin:0; font-size: 44px; font-weight: 900; color:#000; letter-spacing:.2px; }
      .sub { margin: 10px auto 0; font-size: 18px; color:#111; max-width: 68ch; line-height: 1.6; }
      .sub.small { font-size: 16px; color:#444; }

      .card {
        background:#fff;
        color:#000;
        border:2px solid #000;
        border-radius:16px;
        padding:28px;
        margin-bottom:28px;
      }
      .chatCard { padding: 28px 28px 22px; }

      .panelTitle {
        margin:0 0 14px 0;
        font-size:18px;
        font-weight:800;
        text-transform:uppercase;
        letter-spacing:.6px;
      }
      .microNote { margin-top:10px; font-size:13px; color:#444; }

      .hStack { display:flex; gap:12px; align-items:center; }

      .textInput, .textArea {
        border:2px solid #000;
        border-radius:12px;
        padding:14px 16px;
        font-size:16px;
        background:#fff;
        color:#000;
        outline:none;
        line-height:1.5;
      }
      .textInput { width:100%; }
      .textArea { flex:1; min-height: 84px; }

      .btn {
        background:#000;
        color:#fff;
        border:2px solid #000;
        border-radius:12px;
        padding:12px 18px;
        font-weight:800;
        cursor:pointer;
        font-size:16px;
      }
      .btn:disabled { opacity:.7; cursor:default; }

      .ghost {
        background:#fff;
        color:#000;
        border:2px solid #000;
        border-radius:12px;
        padding:10px 14px;
        font-weight:800;
        cursor:pointer;
        font-size:15px;
      }

      /* ====== Chat area breathing room ====== */
      .list {
        max-height: 520px;    /* taller chat window */
        overflow-y: auto;
        margin-bottom: 16px;
        padding-right: 4px;
      }
      .row { display:flex; gap:14px; margin:16px 8px; }
      .row.me { justify-content: flex-end; }
      .avatar { font-size: 22px; line-height: 1; margin-top: 2px; }

      .bubble {
        max-width: 70ch;          /* limit line length for readability */
        padding: 14px 16px;
        border: 2px solid #000;
        border-radius: 14px;
        background: #f7f7f7;
        color: #000;
        line-height: 1.6;
        font-size: 16px;
      }
      .bubble.user { background:#000; color:#fff; }

      .tag { font-size: 12px; font-weight: 700; margin-bottom: 6px; opacity:.7; }
      .msg { white-space: pre-wrap; }

      .composer { display:flex; gap:12px; align-items:flex-end; }

      .dots { display:inline-flex; gap:8px; align-items:center; }
      .dots span { width:6px; height:6px; background:#000; border-radius:50%; opacity:.25; animation: blink 1.2s infinite ease-in-out; }
      .dots span:nth-child(2){ animation-delay:.15s }
      .dots span:nth-child(3){ animation-delay:.3s }
      @keyframes blink { 0%,80%,100%{opacity:.25} 40%{opacity:1} }

      .fomoLine { text-align:center; font-weight:800; margin: 28px 0 8px; font-size:15px; }

      .bottomRight { display:flex; justify-content:flex-end; margin-top: 20px; }

      /* Mobile tweaks for comfort */
      @media (max-width: 560px) {
        .wrap { margin: 40px auto 64px; padding: 0 16px; }
        .hero h1 { font-size: 34px; }
        .sub { font-size: 16px; }
        .panelTitle { font-size: 16px; }
        .list { max-height: 420px; }
        .bubble { max-width: 100%; }
      }
    `}</style>
  )
}
