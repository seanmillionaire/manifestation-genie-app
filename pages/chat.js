// pages/chat.js — One‑Liner, Practical + Light‑Magic Genie with Goal Memory (fixed-height console)
import Questionnaire from '../components/Questionnaire'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'
import GenieFlow from '../components/GenieFlow'

const todayStr = () => new Date().toISOString().slice(0,10)
const HM_STORE_URL = 'https://hypnoticmeditations.ai'  // or your Payhip URL

// ---------- One‑liner + tone helpers (drop-in replacement) ----------
function toOneLiner(text, max = 160) {
  if (!text) return ''
  let t = String(text)
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

  const colon = t.indexOf(':')
  if (colon !== -1) {
    const head = t.slice(0, colon + 1).trim()
    const tail = t.slice(colon + 1).trim()
    let keep = (head + ' ' + tail).slice(0, max)
    return keep.length > 0 ? keep : head
  }

  const parts = t
    .split(/([.?!])/)
    .reduce((acc, cur, i, arr) => { if (i % 2 === 0) acc.push(cur + (arr[i+1] || '')); return acc }, [])
    .map(s => s.trim())
    .filter(Boolean)

  let keep = parts[0] || ''
  if (keep.length < 40 && parts[1]) keep = (keep + ' ' + parts[1]).trim()

  if (keep.length > max) keep = keep.slice(0, max - 1) + '…'
  return keep
}

function enforceTone(raw) {
  if (!raw) return ''
  let t = String(raw)
  t = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
  const kill = [
    'awesome','amazing','magical','celebrate','journey','no worries','you got this',
    'imagine','visualize','picture','ready to','shall we','how about'
  ]
  for (const w of kill) t = t.replace(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')}\\b`,'gi'),'').trim()
  t = t
    .replace(/\bwe paused at\b/gi, 'Resume at')
    .replace(/\bwant to continue now\??/gi, 'Continue?')
    .replace(/\b(let’s|lets)\s+/gi, '')
    .replace(/\(\s*\)/g, '')
    .replace(/"\s*"/g, '')
    .replace(/“\s*”/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/([?!]){2,}/g, '$1')
    .trim()
  return toOneLiner(t, 160)
}

// ---------- heuristics: detect if user's line looks like a goal ----------
function looksLikeGoal(s) {
  if (!s) return false
  const t = s.trim()
  const hints = /(revenue|sales|customers|followers|subs|views|profit|close|appointments|leads|weight|launch|finish|pay off|debt|$|k\b|m\b)/i
  return t.length <= 140 && (/[a-z]/i.test(t)) && (/[.?!]$/.test(t) || hints.test(t))
}

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
  const endRef = useRef(null)
  const inputRef = useRef(null)

  // greet control
  const [bootGreeted, setBootGreeted] = useState(false)

  // today's intent memory
  const [todayIntent, setTodayIntent] = useState(null)

  const PAYHIP_URL = 'https://hypnoticmeditations.ai/b/U7Z5m'

  // --- AUTO‑SCROLL: scroll the chat container, not the page ---
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const id = requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
    return () => cancelAnimationFrame(id)
  }, [messages, sending])

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

  // auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const cur = session?.user?.id
      const nxt = nextSession?.user?.id
      if (event === 'SIGNED_OUT') {
        setSession(null); setHasName(false); setWizardDone(false)
        setProfile(null); setProfileLoaded(false)
        setMessages([]); setBootGreeted(false); setTodayIntent(null)
        return
      }
      if (event === 'SIGNED_IN' && cur !== nxt) {
        setSession(nextSession)
        const nameKey = `mg_hasName_${nxt}`
        const wizKey  = `mg_wizardDone_${nxt}_${todayStr()}`
        setHasName(localStorage.getItem(nameKey) === 'true')
        setWizardDone(localStorage.getItem(wizKey)  === 'true')
        setProfile(null); setProfileLoaded(false)
        setMessages([]); setBootGreeted(false); setTodayIntent(null)
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

  // load profile
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

  // name gate
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

  // greet after profile is loaded; read today's intent
  useEffect(() => {
    async function greet() {
      if (!session?.user?.id || !profileLoaded || bootGreeted) return

      const today = todayStr()
      const [{ data: intentRow }, { data: stepsRows }] = await Promise.all([
        supabase.from('daily_intents').select('intent').eq('user_id', session.user.id).eq('entry_date', today).maybeSingle(),
        supabase.from('action_steps').select('step_order,label,completed').eq('user_id', session.user.id).eq('entry_date', today).order('step_order', { ascending: true })
      ])
      setTodayIntent(intentRow?.intent || null)

      const steps = stepsRows || []
      const firstIncomplete = steps.find(s => !s.completed)

      const hello = `Welcome back, ${userName}. `
      let body
      if (!hasName) {
        body = `Add your name to personalize.`
      } else if (!wizardDone) {
        body = `Resume today’s quick setup.`
      } else if (intentRow?.intent) {
        body = `Continue with “${intentRow.intent}”?`
      } else if (firstIncomplete) {
        body = `Resume at Step ${firstIncomplete.step_order} — ${firstIncomplete.label}. Continue?`
      } else {
        body = `What’s today’s goal in one line?`
      }

      setMessages([{ role: 'assistant', content: enforceTone(hello + body) }])
      setBootGreeted(true)
    }
    greet()
  }, [session?.user?.id, profileLoaded, userName, hasName, wizardDone, bootGreeted])

  // helpers to save/read today's intent
  async function saveTodayIntent(intent) {
    if (!session?.user?.id) return
    const today = todayStr()
    await supabase
      .from('daily_intents')
      .upsert({ user_id: session.user.id, entry_date: today, intent }, { onConflict: 'user_id,entry_date' })
    setTodayIntent(intent)
  }

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

    let justSetIntent = false
    if (!todayIntent && looksLikeGoal(input)) {
      await saveTodayIntent(input)
      justSetIntent = true
    }

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          userName,
          hmUrl: HM_STORE_URL,
        }),
      })

      let rawReply = ''
      try {
        const data = await r.json()
        rawReply = data?.reply ?? data?.message?.content ?? data?.content ?? data?.choices?.[0]?.message?.content ?? ''
      } catch {
        rawReply = await r.text()
      }

      const yesish = /^(y|ya|yes|yep|sure|ok|okay)$/i.test(input.trim())
      if (yesish && (todayIntent || input)) {
        const goal = todayIntent || input
        const line = `Locked: “${goal}”. First move: list the 3 highest‑leverage actions.`
        setMessages([...next, { role: 'assistant', content: line }])
        setSending(false); inputRef.current?.focus()
        return
      }

      let finalLine
      if (justSetIntent) {
        finalLine = `Locked: “${input}”. Continue with this plan?`
      } else if (todayIntent && /^(change|new|switch)/i.test(input)) {
        finalLine = `Noted. What’s the new goal?`
      } else {
        finalLine = enforceTone(rawReply || 'Done.')
      }

      setMessages([...next, { role: 'assistant', content: finalLine }])
    } catch {
      setMessages([...next, { role: 'assistant', content: enforceTone('Error. Try again.') }])
    } finally {
      setSending(false); inputRef.current?.focus()
    }
  }

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
          <a className="btn" href="https://hypnoticmeditations.ai/b/U7Z5m">Get Access</a>
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

      {!hasName && <NameStep session={session} setHasName={setHasName} setProfile={setProfile} setProfileLoaded={setProfileLoaded} />}

      {hasName && !wizardDone && (
        <section className="card">
          <h2 className="panelTitle">Step 2 — Today’s Genie Flow</h2>
          <Questionnaire session={session} onDone={handleWizardDone} />
          <div className="microNote">Complete the flow to unlock the chat console.</div>
        </section>
      )}

      {hasName && wizardDone && (
        <section className="card chatCard">
          <h2 className="panelTitle">Chat with the Genie</h2>
          <div className="list" ref={listRef}>
            {messages.map((m, i) => {
              const isUser = m.role === 'user'
              const isGenie = m.role === 'assistant' || m.role === 'bot'
              return (
                <div key={i} className={`row ${isUser ? 'me' : ''}`}>
                  <div className="avatar">{isUser ? '🫵' : (isGenie ? '🧞‍♂️' : '🤖')}</div>
                  <div className={`bubble ${isUser ? 'user' : ''}`}>
                    <div className="tag">{isUser ? 'You' : 'Manifestation Genie'}</div>
                    <div className="msg">
                      {isGenie ? enforceTone(m.content) : m.content}
                    </div>
                  </div>
                </div>
              )
            })}
            {sending && (
              <div className="row">
                <div className="avatar">🧞‍♂️</div>
                <div className="bubble">
                  <div className="tag">Manifestation Genie</div>
                  <div className="dots"><span /><span /><span /></div>
                </div>
              </div>
            )}
            <div ref={endRef} aria-hidden="true" />
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

// kept your NameStep but parameterized to avoid duplicate hooks when moved
function NameStep({ session, setHasName, setProfile, setProfileLoaded }) {
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

      /* Make chat card a column so the fixed-height list + composer stack cleanly */
      .chatCard { 
        padding: 28px 28px 22px; 
        display:flex; 
        flex-direction:column;
      }

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

      /* FIXED HEIGHT CHAT CONSOLE */
      .list {
        height: 420px;                 /* 🔒 fixed from first render */
        min-height: 420px;             /* keep the box from shrinking */
        overflow-y: auto;              /* scroll when content grows */
        margin-bottom: 16px;
        padding-right: 4px;
        scroll-behavior: smooth;
        overscroll-behavior: contain;
        scrollbar-gutter: stable both-edges;
      }

      .row { display:flex; gap:14px; margin:16px 8px; }
      .row.me { justify-content: flex-end; }
      .avatar { font-size: 22px; line-height: 1; margin-top: 2px;
        font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji", system-ui, sans-serif !important;
      }

      .bubble {
        max-width: 70ch;
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

      .composer { 
        display:flex; 
        gap:12px; 
        align-items:flex-end; 
        margin-top: 8px; 
      }

      .dots { display:inline-flex; gap:8px; align-items:center; }
      .dots span { width:6px; height:6px; background:#000; border-radius:50%; opacity:.25; animation: blink 1.2s infinite ease-in-out; }
      .dots span:nth-child(2){ animation-delay:.15s }
      .dots span:nth-child(3){ animation-delay:.3s }
      @keyframes blink { 0%,80%,100%{opacity:.25} 40%{opacity:1} }

      .fomoLine { text-align:center; font-weight:800; margin: 28px 0 8px; font-size:15px; }

      .bottomRight { display:flex; justify-content:flex-end; margin-top: 20px; }

      @media (max-width: 560px) {
        .wrap { margin: 40px auto 64px; padding: 0 16px; }
        .hero h1 { font-size: 34px; }
        .sub { font-size: 16px; }
        .panelTitle { font-size: 16px; }
        .list { height: 420px; min-height: 420px; }  /* smaller but still fixed on mobile */
        .bubble { max-width: 100%; }
      }
    `}</style>
  )
}
