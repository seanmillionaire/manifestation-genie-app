// pages/chat.js — One-Liner, No-Fluff Genie (🧞‍♂️ / 🫵)
import Questionnaire from '../components/Questionnaire'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'
import GenieFlow from '../components/GenieFlow'

const todayStr = () => new Date().toISOString().slice(0,10)
const HM_STORE_URL = 'https://hypnoticmeditations.ai'  // or your Payhip URL

// ---------- Tone tools: strip fluff → compress to a single practical line ----------
function enforceTone(raw) {
  if (!raw) return ''
  let t = String(raw)

  // 1) Remove emojis/sparkles and decorative symbols
  t = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')

  // 2) Lower noise words & hype
  const KILL = [
    'awesome','great','amazing','beautiful','magical','powerful','sparkling','excited',
    'let’s','lets','imagine','visualize','picture','ready to','shall we','how about',
    'no worries','don’t worry','i understand','you got this','journey','celebrate',
    'manifest','vibes','energy','✨','⭐','🎉','👏','😉','🙂','😊'
  ]
  const REPLACE = [
    [/^\s*hey[,!]\s*/i, ''],
    [/\b(step\s*\d+:?)\s*/ig, ''],
    [/\b(can you|could you|would you|would you like to|wanna)\b/gi, ''],
    [/\b(let me|i can|i will)\b/gi, ''],
    [/\b(i’ll|we’ll|we are going to|i am going to)\b/gi, ''],
    [/\b(in a few moments|for a moment|right now)\b/gi, ''],
    [/\b(one sentence|in one sentence)\b/gi, ''],
    [/\b(quick|quickly|just)\b/gi, ''],
    [/\b(please|kindly)\b/gi, ''],
    [/[!]+/g, ''],
    [/\s{2,}/g, ' '],
  ]
  for (const w of KILL) t = t.replace(new RegExp('\\b'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','gi'), '')
  for (const [re, sub] of REPLACE) t = t.replace(re, sub)

  // 3) Convert fluffy starters into imperatives/questions
  t = t.replace(/\b(let us|let’s|lets)\s+/gi, '')
       .replace(/\bwe\s+paused\s+at\b/gi, 'Resume at')
       .replace(/\bwant to continue now\??/gi, 'Continue?')
       .replace(/\bdoes that feel better\??/gi, 'Better?')
       .replace(/\bready\??/gi, 'Ready?')

  // 4) Collapse whitespace
  t = t.replace(/\s+/g, ' ').trim()

  // 5) Prefer first concrete clause; trim length
  return toOneLiner(t, 120)
}

function toOneLiner(text, max = 160) {
  if (!text) return ''
  let t = String(text).replace(/\s+/g, ' ').trim()
  // strip markdown junk
  t = t.replace(/[*_`#>|-]/g, '').trim()
  // prefer first punctuation stop
  if (t.length > max) {
    const stop = t.search(/[.?;:]/)
    if (stop !== -1 && stop < max) t = t.slice(0, stop + 1)
    if (t.length > max) t = t.slice(0, max - 1) + '…'
  }
  // remove trailing hype punctuation
  t = t.replace(/[!]+$/,'').trim()
  return t
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

  // auth listener
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
          userName,              // Supabase name/fallback
          hmUrl: HM_STORE_URL,   // Store URL
          // (Optional) You can also harden tone server-side by adding a system prompt there.
        }),
      })

      // Try JSON; fall back to text
      let rawReply = ''
      try {
        const data = await r.json()
        rawReply = data?.reply ?? data?.message?.content ?? data?.content ?? data?.choices?.[0]?.message?.content ?? ''
      } catch {
        rawReply = await r.text()
      }

      const oneLine = enforceTone(rawReply || 'Done.')
      setMessages([...next, { role: 'assistant', content: oneLine }])
    } catch {
      setMessages([...next, { role: 'assistant', content: enforceTone('Error. Try again.') }])
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

  // Greet after profile is loaded (filtered)
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

      const hello = `Welcome back, ${userName}. `
      let body
      if (!hasName) {
        body = `Add your name to personalize.`
      } else if (!wizardDone) {
        body = `Resume today’s quick setup.`
      } else if (firstIncomplete) {
        body = `Resume at Step ${firstIncomplete.step_order}: “${firstIncomplete.label}”?`
      } else if (steps.length > 0) {
        body = `You finished today’s steps. Reflect or start a new intent?`
      } else if (intentRow?.intent) {
        body = `Current intent: “${intentRow.intent}”. Generate a plan?`
      } else {
        body = `Start today’s flow?`
      }

      setMessages([{ role: 'assistant', content: enforceTone(hello + body) }])
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

      .list {
        max-height: 520px;
        overflow-y: auto;
        margin-bottom: 16px;
        padding-right: 4px;
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

      .composer { display:flex; gap:12px; align-items:flex-end; }

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
        .list { max-height: 420px; }
        .bubble { max-width: 100%; }
      }
    `}</style>
  )
}
