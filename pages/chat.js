// pages/chat.js — Chat + Gate with GenieFlow (drop-in)
import GenieFlow from '../components/GenieFlow'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'

const todayStr = () => new Date().toISOString().slice(0,10)
const HM_STORE_URL = 'https://hypnoticmeditations.ai'
const PAYHIP_URL = 'https://hypnoticmeditations.ai/b/U7Z5m'

// ---------- One‑liner + tone helpers ----------
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
    const keep = (head + ' ' + tail).slice(0, max)
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
  const kill = ['awesome','amazing','magical','celebrate','journey','no worries','you got this','imagine','visualize','picture','ready to','shall we','how about']
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

// ---------- detect if user's line looks like a goal ----------
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

  // --- NEW: restart / continue choice banner ---
  const [showReturnChoice, setShowReturnChoice] = useState(false)
  function continueToday() {
    setShowReturnChoice(false)
    setMessages(m => [
      ...m,
      { role: 'assistant', content: enforceTone("Continuing today’s path. What’s the next move?") }
    ])
  }
  async function restartQuestionnaire() {
    const uid = session?.user?.id
    if (!uid) return
    localStorage.removeItem(`mg_wizardDone_${uid}_${todayStr()}`) // reopen Step 2 for today
    setWizardDone(false)
    setTodayIntent(null)
    setShowReturnChoice(false)
    setMessages(m => [
      ...m,
      { role: 'assistant', content: enforceTone('Starting fresh. Step 2 is ready.') }
    ])
  }

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

      const hello = `✨ Welcome back, ${userName}. `
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
      setShowReturnChoice(true)
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

    // quick voice commands for the choice
    const cmd = input.toLowerCase()
    if (/(^|\b)(restart|start over|reset setup|begin again)(\b|$)/i.test(cmd)) {
      await restartQuestionnaire()
      e.target.reset()
      return
    }
    if (/(^|\b)(continue|resume|carry on|proceed)(\b|$)/i.test(cmd)) {
      continueToday()
      e.target.reset()
      return
    }

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
        body: JSON.stringify({ messages: next, userName, hmUrl: HM_STORE_URL }),
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
        <img
          src="https://storage.googleapis.com/mixo-sites/images/file-3ee255ce-ebaa-41de-96f6-a1233499cf70.png"
          alt="Manifestation Genie Logo"
          style={{ height: "60px", width: "auto" }}
          className="mb-3"
        />
        <p className="sub">Your Personal AI Assistant for Turning Goals into Reality</p>
        <p className="sub small">✨ Welcome back, {userName}.</p>
      </header>

      {/* --- Restart vs Continue bar --- */}
      {showReturnChoice && hasName && (
        <section className="card choiceBar">
          <div className="choiceRow">
            <div className="choiceCopy">
              <strong>How shall we proceed?</strong>
              <span className="hint">Choose a new goal, or continue your path for today.</span>
            </div>
            <div className="choiceActions">
              <button type="button" className="linkBtn" onClick={restartQuestionnaire}>
                New Goal
              </button>
              <button type="button" className="btn btn-primary" onClick={continueToday}>
                Continue Today
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Step 1: Name gate stays as-is in your app (not shown here) */}

      {/* Step 2: Flow gate */}
      {hasName && !wizardDone && (
        <section className="card wizardCard">
          <h2 className="panelTitle">Today’s Focus</h2>
          <div className="wizardScope">
            <GenieFlow session={session} onDone={handleWizardDone} />
          </div>
          <div className="microNote">Complete this to unlock the chat.</div>
        </section>
      )}

      {/* Chat console */}
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
                    <div className="msg">{isGenie ? enforceTone(m.content) : m.content}</div>
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
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </form>
        </section>
      )}

      <div className="fomoLine"><p>🔥 108 people used Manifestation Genie today</p></div>

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
      * { box-sizing: border-box; }
      .wrap { max-width: 960px; margin: 48px auto 72px; padding: 0 24px; }
      .hero { text-align: center; margin-bottom: 28px; }
      .sub { margin: 10px auto 0; font-size: 18px; color: rgba(255,255,255,0.9); max-width: 68ch; line-height: 1.6; }
      .sub.small { font-size: 16px; color: rgba(255,255,255,0.7); }

      /* Cards */
      .card {
        background: rgba(255,255,255,0.04);
        color: var(--white);
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 16px;
        padding: 22px;
        margin-bottom: 22px;
        backdrop-filter: blur(6px);
      }
      .center { display:flex; flex-direction:column; align-items:center; text-align:center; }

      /* Choice bar */
      .choiceBar { padding: 14px 16px; margin-top: 16px; }
      .choiceRow { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; }
      .choiceCopy { display:flex; flex-direction:column; gap:4px; }
      .choiceCopy .hint { font-size:13px; color: rgba(255,255,255,0.7); }
      .choiceActions { display:flex; gap:10px; }

      /* Subtle text button for Restart */
      .linkBtn {
        background: transparent;
        border: 0;
        color: rgba(255,255,255,0.7);
        font-weight: 800;
        padding: 8px 10px;
        border-radius: 8px;
        cursor: pointer;
      }
      .linkBtn:hover { color: var(--gold); text-decoration: underline; }
      .linkBtn:focus { outline: none; box-shadow: 0 0 0 2px rgba(255,215,0,0.25); border-radius: 8px; }

      /* Chat card */
      .chatCard {
        padding: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.10);
        background:
          radial-gradient(1200px 400px at 20% -20%, rgba(255,255,255,0.06), transparent 60%),
          rgba(255,255,255,0.03);
      }
      .chatCard .panelTitle {
        margin: 0;
        padding: 16px 18px 8px;
        font-size: 16px;
        font-weight: 800;
        letter-spacing: .6px;
        color: var(--gold);
      }

      /* Chat list */
      .list {
        flex: 1;
        overflow-y: auto;
        padding: 8px 16px 16px;
        scroll-behavior: smooth;
        overscroll-behavior: contain;
        scrollbar-gutter: stable both-edges;
        -webkit-overflow-scrolling: touch;
      }

      /* Bubbles */
      .row { display:flex; gap:12px; margin:10px 4px; }
      .row.me { justify-content: flex-end; }
      .avatar { font-size: 20px; line-height: 1; margin-top: 4px; }

      .bubble {
        max-width: 62ch;
        padding: 14px 16px;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 14px;
        background: rgba(255,255,255,0.06);
        color: var(--white);
        line-height: 1.6;
        font-size: 15.5px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.18);
      }
      .bubble.user {
        background: #FFE169;
        color: #0D1B2A;
        border-color: #FFE169;
      }
      .tag { font-size: 11px; font-weight: 800; margin-bottom: 6px; opacity:.7; }
      .row.me .tag { color: #0D1B2A; opacity:.85; }
      .msg { white-space: pre-wrap; }

      /* Composer */
      .composer {
        display:flex; gap:10px; align-items:flex-end;
        padding: 12px;
        border-top: 1px solid rgba(255,255,255,0.08);
        background: rgba(0,0,0,0.25);
      }
      .textArea {
        flex: 1;
        min-height: 84px;
        border: 1px solid #1E3448;
        border-radius: 12px;
        padding: 12px 14px;
        font-size: 15px;
        background: #0F2435;
        color: var(--white);
        outline: none;
      }
      .textArea:focus { border-color: var(--gold); }

      .btn.btn-primary {
        font-weight: 900;
        padding: 12px 16px;
        border-radius: 12px;
        border: 0;
        background: var(--gold);
        color: #0D1B2A;
        box-shadow: 0 6px 16px rgba(0,0,0,0.25);
        filter: drop-shadow(0 0 8px rgba(255,215,0,0.35));
        cursor: pointer;
      }
      .btn.btn-primary:hover { background: var(--green); color: #082117; }

      /* Typing dots */
      .dots { display:inline-flex; gap:8px; align-items:center; }
      .dots span { width:6px; height:6px; background: var(--gold); border-radius:50%; opacity:.35; animation: blink 1.2s infinite ease-in-out; }
      .dots span:nth-child(2){ animation-delay:.15s }
      .dots span:nth-child(3){ animation-delay:.3s }
      @keyframes blink { 0%,80%,100%{opacity:.25} 40%{opacity:1} }

      .fomoLine { text-align:center; font-weight:800; margin: 20px 0 6px; font-size:15px; color: rgba(255,255,255,0.8); }
      .bottomRight { display:flex; justify-content:flex-end; margin-top: 16px; }

      /* Mobile */
      @media (max-width: 560px) {
        .wrap { margin: 32px auto 56px; padding: 0 16px; }
        .chatCard .panelTitle { padding: 14px 14px 6px; }
        .list { padding: 6px 10px 12px; }
      }
    `}</style>
  )
}
