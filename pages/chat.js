// pages/chat.js — Clean, single-path flow (no Restart/Continue fork)
// One‑Liner, Practical + Light‑Magic Genie with Goal Memory (fixed-height console, cleaned)
import Questionnaire from '../components/Questionnaire'
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

  // --- (kept) voice-only helpers: allow users to type "restart" / "continue" if they want ---
  function continueToday() {
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
    setMessages(m => [
      ...m,
      { role: 'assistant', content: enforceTone('Starting fresh. Step 2 — Today’s Genie Flow is ready.') }
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

  // greet after profile is loaded; read today's intent (no fork, just gentle welcome)
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

      const hello = `✨ Welcome back, ${userName}.`
      let body
      if (!hasName) {
        body = `Add your name to personalize.`
      } else if (!wizardDone) {
        body = `Begin today’s quick check‑in.`
      } else if (intentRow?.intent) {
        body = `Locked goal: “${intentRow.intent}”. Continue?`
      } else if (firstIncomplete) {
        body = `Resume Step ${firstIncomplete.step_order} — ${firstIncomplete.label}.`
      } else {
        body = `What’s today’s goal in one line?`
      }

      setMessages([{ role: 'assistant', content: enforceTone(`${hello} ${body}`) }])
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

    // hidden quick commands (keep power users happy)
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

      {/* Step 1 — Name (only if missing) */}
      {!hasName && <NameStep session={session} setHasName={setHasName} setProfile={setProfile} setProfileLoaded={setProfileLoaded} />}

      {/* Step 2 — Today’s Genie Flow (auto-start, no fork) */}
      {hasName && !wizardDone && (
        <section className="card wizardCard">
          <h2 className="panelTitle">Start Today’s Manifestation</h2>
          <div className="wizardScope">
            <Questionnaire session={session} onDone={handleWizardDone} />
          </div>
          <div className="microNote"></div>
        </section>
      )}

      {/* Chat console after the flow */}
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

function NameStep({ session, setHasName, setProfile, setProfileLoaded }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!session?.user?.id) return
      const { data } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
      if (cancelled) return
      setName(data?.full_name || ''); setLoading(false)
    })()
    return () => { cancelled = true }
  }, [session?.user?.id])

  async function save() {
    if (!session?.user?.id) return
    setSaving(true)
    await supabase.from('profiles').upsert({ id: session.user.id, full_name: name || null })
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
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !name.trim()}>
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
      /* globals come from globals.css */
      /* === HARD OVERRIDE so the questionnaire matches the dark theme === */

      .wizardCard { overflow: hidden; }
      .wizardScope {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 12px;
        padding: 12px;
      }

      .wizardScope :global(*) {
        background: transparent !important;
        background-color: transparent !important;
        color: var(--white) !important;
        border-color: rgba(255,255,255,0.15) !important;
        font-family: inherit !important;
      }

      .wizardScope :global(input),
      .wizardScope :global(textarea),
      .wizardScope :global(select) {
        background: #0F2435 !important;
        color: var(--white) !important;
        border: 1px solid #1E3448 !important;
        border-radius: 12px !important;
        padding: 12px 14px !important;
      }
      .wizardScope :global(input:focus),
      .wizardScope :global(textarea:focus),
      .wizardScope :global(select:focus) {
        border-color: var(--gold) !important;
      }

      .wizardScope :global(.pill),
      .wizardScope :global(.option),
      .wizardScope :global(.choice),
      .wizardScope :global([class*="option"]),
      .wizardScope :global([class*="Choice"]) {
        background: rgba(255,255,255,0.06) !important;
        border: 1px solid rgba(255,255,255,0.15) !important;
        color: var(--white) !important;
        border-radius: 14px !important;
      }

      .wizardScope :global(button),
      .wizardScope :global(.btn) {
        font-weight: 800 !important;
        border-radius: 12px !important;
      }
      .wizardScope :global(.btn-primary),
      .wizardScope :global(button[type="submit"]),
      .wizardScope :global([class*="primary"]) {
        background: var(--gold) !important;
        color: #0D1B2A !important;
        border: 0 !important;
        box-shadow: 0 6px 16px rgba(0,0,0,0.25) !important;
        filter: drop-shadow(0 0 8px rgba(255,215,0,0.35)) !important;
      }
      .wizardScope :global(.btn-primary:hover),
      .wizardScope :global(button[type="submit"]:hover),
      .wizardScope :global([class*="primary"]:hover) {
        background: var(--green) !important;
        color: #082117 !important;
      }

      .wizardScope :global(.btn-secondary),
      .wizardScope :global(.ghost),
      .wizardScope :global([class*="secondary"]),
      .wizardScope :global(button.back) {
        background: transparent !important;
        color: var(--white) !important;
        border: 1px solid rgba(255,255,255,0.3) !important;
      }

      .wizardScope :global(img),
      .wizardScope :global(video),
      .wizardScope :global(svg),
      .wizardScope :global(canvas) {
        background: transparent !important;
        border-color: transparent !important;
      }

      .wizardScope :global(.meta),
      .wizardScope :global(.subtitle),
      .wizardScope :global(.help),
      .wizardScope :global(.hint) {
        color: rgba(255,255,255,0.8) !important;
      }

      * { box-sizing: border-box; }
      .wrap { max-width: 960px; margin: 48px auto 72px; padding: 0 24px; }

      .hero { text-align: center; margin-bottom: 28px; }
      .hero h1 { margin:0; font-size: 44px; font-weight: 900; color: var(--gold); letter-spacing:.2px; }
      .sub { margin: 10px auto 0; font-size: 18px; color: rgba(255,255,255,0.9); max-width: 68ch; line-height: 1.6; }
      .sub.small { font-size: 16px; color: rgba(255,255,255,0.7); }

      .card {
        background: rgba(255,255,255,0.04);
        color: var(--white);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius:16px;
        padding:22px;
        margin-bottom:22px;
        backdrop-filter: blur(6px);
      }
      .center { display:flex; flex-direction:column; align-items:center; text-align:center; }

      .chatCard {
        padding: 22px;
        display: flex;
        flex-direction: column;
        max-height: 70vh;
        min-height: 360px;
      }

      .panelTitle { margin:0 0 12px 0; font-size:18px; font-weight:800; text-transform:uppercase; letter-spacing:.6px; color: var(--gold); }
      .microNote { margin-top:8px; font-size:13px; color: rgba(255,255,255,0.65); }

      .hStack { display:flex; gap:12px; align-items:center; }

      .textInput, .textArea {
        border:1px solid #1E3448;
        border-radius:12px;
        padding:14px 16px;
        font-size:16px;
        background:#0F2435;
        color: var(--white);
        outline:none;
        line-height:1.5;
      }
      .textInput { width:100%; }
      .textArea { flex:1; min-height: 84px; }
      .textInput:focus, .textArea:focus { border-color: var(--gold); }

      .btn { font-size:16px; }
      .btn:disabled { opacity:.7; cursor:default; }
      .ghost {
        background: transparent;
        color: var(--white);
        border:1px solid rgba(255,255,255,0.3);
        border-radius:12px;
        padding:10px 14px;
        font-weight:800;
        cursor:pointer;
        font-size:15px;
      }
      .ghost:hover { border-color: var(--gold); color: var(--gold); }

      .list {
        flex: 1;
        overflow-y: auto;
        margin-bottom: 12px;
        padding-right: 6px;
        scroll-behavior: smooth;
        overscroll-beavior: contain;
        scrollbar-gutter: stable both-edges;
        -webkit-overflow-scrolling: touch;
      }

      .row { display:flex; gap:14px; margin:12px 8px; }
      .row.me { justify-content: flex-end; }
      .avatar { font-size: 22px; line-height: 1; margin-top: 2px; font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji", system-ui, sans-serif !important; }

      .bubble {
        max-width: 70ch;
        padding: 14px 16px;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 14px;
        background: rgba(255,255,255,0.06);
        color: var(--white);
        line-height: 1.6;
        font-size: 16px;
      }
      .bubble.user {
        background: var(--gold);
        color: #0D1B2A;
        border-color: var(--gold);
      }

      .tag { font-size: 12px; font-weight: 700; margin-bottom: 6px; opacity:.7; color: rgba(255,255,255,0.8); }
      .row.me .tag { color: #0D1B2A; opacity:.85; }

      .msg { white-space: pre-wrap; }

      .composer { display:flex; gap:12px; align-items:flex-end; margin-top: 4px; }

      .dots { display:inline-flex; gap:8px; align-items:center; }
      .dots span { width:6px; height:6px; background: var(--gold); border-radius:50%; opacity:.35; animation: blink 1.2s infinite ease-in-out; }
      .dots span:nth-child(2){ animation-delay:.15s }
      .dots span:nth-child(3){ animation-delay:.3s }
      @keyframes blink { 0%,80%,100%{opacity:.25} 40%{opacity:1} }

      .fomoLine { text-align:center; font-weight:800; margin: 20px 0 6px; font-size:15px; color: rgba(255,255,255,0.8); }
      .bottomRight { display:flex; justify-content:flex-end; margin-top: 16px; }

      @media (max-width: 560px) {
        .wrap { margin: 32px auto 56px; padding: 0 16px; }
        .hero h1 { font-size: 34px; }
        .sub { font-size: 16px; }
        .panelTitle { font-size: 16px; }
        .chatCard { max-height: 60vh; min-height: 300px; }
      }
    `}</style>
  )
}
