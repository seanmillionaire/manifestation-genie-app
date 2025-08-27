// pages/chat.js — Linear Flow + Persistent Chat (no refresh wipe)
import Questionnaire from '../components/Questionnaire'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'

const todayStr = () => new Date().toISOString().slice(0,10)
const HM_STORE_URL = 'https://hypnoticmeditations.ai'
const PAYHIP_URL = 'https://hypnoticmeditations.ai/b/U7Z5m'

// ---------- One-liner + tone helpers ----------
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
    .map(s => s.trim()).filter(Boolean)
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

  // name gate + intent
  const [hasName, setHasName] = useState(false)
  const [checkingName, setCheckingName] = useState(true)
  const [todayIntent, setTodayIntent] = useState(null)

  // ----- Linear stage machine: 'vibe' -> 'proceed' -> 'wizard' -> 'chat'
  const [stage, setStage] = useState('vibe')
  const [vibe, setVibe] = useState(null)

  // chat
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  // --------- Storage helpers (per-user, per-day)
  const storageBase = session?.user?.id ? `mg_${session.user.id}_${todayStr()}` : null
  const key = (k) => storageBase ? `${storageBase}_${k}` : null

  // 1) get session
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session || null)
    })()
  }, [])

  // 2) auth listener — ONLY reset on SIGNED_OUT
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setProfile(null); setProfileLoaded(false)
        setHasName(false); setCheckingName(true)
        setTodayIntent(null); setStage('vibe'); setVibe(null)
        setMessages([]); setSending(false)
      } else if (event === 'SIGNED_IN') {
        setSession(nextSession)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // 3) allowlist
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

  // 4) load profile + name
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!session?.user?.id) return
      const { data } = await supabase
        .from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
      if (cancelled) return
      setProfile(data || null); setProfileLoaded(true)
      const ok = !!(data?.full_name && data.full_name.trim())
      setHasName(ok); setCheckingName(false)
    })()
    return () => { cancelled = true }
  }, [session?.user?.id])

  // 5) read today's intent
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!session?.user?.id) return
      const today = todayStr()
      const { data } = await supabase
        .from('daily_intents').select('intent').eq('user_id', session.user.id).eq('entry_date', today).maybeSingle()
      if (!cancelled) setTodayIntent(data?.intent || null)
    })()
    return () => { cancelled = true }
  }, [session?.user?.id])

  // 6) RESTORE persisted UI state BEFORE any greetings
  useEffect(() => {
    if (!storageBase) return
    try {
      const savedStage = localStorage.getItem(key('stage'))
      const savedVibe  = localStorage.getItem(key('vibe'))
      const savedMsgs  = localStorage.getItem(key('messages'))
      const savedIntent= localStorage.getItem(key('intent'))

      if (savedStage) setStage(savedStage)
      if (savedVibe)  setVibe(savedVibe)
      if (savedIntent) setTodayIntent(savedIntent)

      if (savedMsgs) {
        const parsed = JSON.parse(savedMsgs)
        if (Array.isArray(parsed)) setMessages(parsed)
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageBase])

  // 7) PERSIST on changes (throttled by requestAnimationFrame)
  useEffect(() => {
    if (!storageBase) return
    let raf = requestAnimationFrame(() => {
      try {
        localStorage.setItem(key('stage'), stage)
        if (vibe) localStorage.setItem(key('vibe'), vibe)
        if (todayIntent !== null) localStorage.setItem(key('intent'), todayIntent || '')
        localStorage.setItem(key('messages'), JSON.stringify(messages))
      } catch {}
    })
    return () => cancelAnimationFrame(raf)
  }, [storageBase, stage, vibe, todayIntent, messages])

  // 8) auto-scroll chat list
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const id = requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
    return () => cancelAnimationFrame(id)
  }, [messages, sending])

  // --- flow handlers ---
  function handleVibePick(val) { setVibe(val); setStage('proceed') }

  async function handleProceed(continueLast) {
    if (!session?.user?.id) return
    const uid = session.user.id
    if (!continueLast) {
      // new goal
      await supabase
        .from('daily_intents')
        .upsert({ user_id: uid, entry_date: todayStr(), intent: null }, { onConflict: 'user_id,entry_date' })
      setTodayIntent(null)
    }
    setStage('wizard')
  }

  function handleWizardDone() {
    setStage('chat')
    // Seed greeting ONLY if there isn't existing chat
    if (!messages.length) {
      const hello = enforceTone(`✨ Welcome back, ${userName}. What’s the next move?`)
      setMessages([{ role: 'assistant', content: hello }])
    }
  }

  // save today's intent when user sends a goal-ish line
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
        const line = `Locked: “${goal}”. First move: list the 3 highest-leverage actions.`
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

  return (
    <div className="wrap">
      {/* Header with Logout */}
      <header className="hero">
        <div className="heroRow">
          <div className="heroText">
            <p className="welcome">🧞‍♂️ Welcome back, {userName}</p>
            <p className="sub">Your genie has opened today’s portal — let’s manifest ✨</p>
          </div>
          <div className="heroActions">
            <button type="button" className="ghost" onClick={() => supabase.auth.signOut()}>Logout</button>
          </div>
        </div>
      </header>

      {/* Stage 1 — Vibe */}
      {stage === 'vibe' && (
        <section className="card vibeCard">
          <div className="vibeRow">
            <div className="vibeCopy">
              <strong>Quick check-in</strong>
              <span className="hint">How’s your vibe today?</span>
            </div>
            <div className="vibeActions">
              <button type="button" onClick={() => handleVibePick('Good')}>🙂 Good</button>
              <button type="button" onClick={() => handleVibePick('Okay')}>😌 Okay</button>
              <button type="button" onClick={() => handleVibePick('Low')}>😕 Low</button>
            </div>
          </div>
        </section>
      )}

      {/* Stage 2 — Proceed */}
      {stage === 'proceed' && (
        <section className="card choiceBar">
          <div className="choiceRow">
            <div className="choiceCopy">
              <strong>How shall we proceed?</strong>
              <span className="hint">
                {todayIntent ? `Continue with “${todayIntent}” or set a new goal.` : 'Set a new goal to start your ritual.'}
              </span>
            </div>
            <div className="choiceActions">
              <button type="button" className="linkBtn" onClick={() => handleProceed(false)}>+ New Goal</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleProceed(true)}
                disabled={!todayIntent}
                title={todayIntent ? '' : 'No saved goal yet'}
              >
                Continue Last Goal
              </button>
            </div>
          </div>
          <ul className="stack">
            <li><strong>6 guided steps</strong> • ~3 min</li>
            <li><strong>Instant clarity reset</strong></li>
            <li><strong>Subconscious lock-in ritual</strong></li>
          </ul>
        </section>
      )}

      {/* Stage 3 — Wizard */}
      {stage === 'wizard' && hasName && (
        <section className="card wizardCard">
          <div className="chipRow">
            <span className="chip">Step 1 of 6</span>
            <span className="dot">•</span>
            <span className="chipTitle">Tune Your Frequency</span>
          </div>
          <h2 className="panelTitle">Start Today’s Manifestation</h2>
          <div className="wizardScope">
            <Questionnaire session={session} onDone={handleWizardDone} />
          </div>
        </section>
      )}

      {/* Stage 4 — Chat */}
      {stage === 'chat' && (
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

      {/* Static social proof */}
      <div className="fomoLine">
        <p>🔥 <strong>108</strong> manifestors activated their Genie today — join the current.</p>
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
      :root { --gold:#FFD600; --green:#19E28A; --white:#fff; }
      .wrap { max-width: 960px; margin: 24px auto 64px; padding: 0 24px; }

      .hero { margin-bottom: 16px; }
      .heroRow { display:flex; align-items:center; justify-content:space-between; gap:12px; }
      .welcome{ font-size: 22px; font-weight: 800; margin: 0 0 6px; color: var(--white); }
      .sub { margin: 0; font-size: 18px; color: rgba(255,255,255,0.9); max-width: 68ch; line-height: 1.6; }
      .sub.small { font-size: 16px; color: rgba(255,255,255,0.78); }
      .heroActions .ghost{
        background: transparent; border: 1px solid rgba(255,255,255,0.2);
        color: rgba(255,255,255,0.92); padding: 8px 12px; border-radius: 10px; font-weight: 800; cursor: pointer;
      }

      .card {
        background: rgba(255,255,255,0.04);
        color: var(--white);
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 16px;
        padding: 18px;
        margin-bottom: 18px;
        backdrop-filter: blur(6px);
        box-shadow: 0 10px 28px rgba(0,0,0,.25);
      }
      .center { display:flex; flex-direction:column; align-items:center; text-align:center; }

      .vibeRow { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; }
      .vibeCopy { display:flex; flex-direction:column; gap:4px; }
      .vibeCopy .hint { font-size:13px; color: rgba(255,255,255,0.72); }
      .vibeActions { display:flex; gap:10px; flex-wrap:wrap; }
      .vibeCard button{
        position: relative; border-radius: 12px; padding: 10px 14px; font-weight: 800;
        background: linear-gradient(180deg, #ffffff, #E9EEF3); color: #0D1B2A; border: 1px solid rgba(13,27,42,.18);
        box-shadow: inset 0 1px 0 #fff, 0 4px 14px rgba(0,0,0,.18); transition: transform .16s ease, box-shadow .16s ease, filter .16s ease; cursor:pointer;
      }
      .vibeCard button:hover{
        transform: translateY(-1px);
        box-shadow: inset 0 1px 0 #fff, 0 8px 18px rgba(0,0,0,.22), 0 0 22px rgba(102,51,204,.25);
      }

      .choiceBar { padding: 16px 16px 12px; }
      .choiceRow { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; }
      .choiceCopy { display:flex; flex-direction:column; gap:4px; }
      .choiceCopy .hint { font-size:13px; color: rgba(255,255,255,0.72); }
      .choiceActions { display:flex; gap:10px; flex-wrap:wrap; }

      .stack{ display:flex; gap:12px; flex-wrap:wrap; margin:12px 0 0; padding:0; list-style:none; color:rgba(255,255,255,.82); }
      .stack li{ padding:8px 10px; border-radius:10px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.05); font-size:13.5px; }

      .linkBtn {
        background: transparent; border: 1px solid rgba(255,255,255,0.18); color: rgba(255,255,255,0.9);
        font-weight: 800; padding: 10px 12px; border-radius: 10px; cursor: pointer;
        transition: background .15s ease, box-shadow .15s ease, transform .15s ease;
      }
      .linkBtn:hover { color: var(--white); background: rgba(255,255,255,0.06); box-shadow: 0 0 14px rgba(255,255,255,.18) inset, 0 0 10px rgba(255,255,255,.12); transform: translateY(-1px); }

      .btn.btn-primary {
        font-weight: 900; padding: 12px 16px; border-radius: 12px; border: 0; background: var(--gold); color: #0D1B2A;
        box-shadow: 0 0 22px rgba(255,214,0,.55); filter: drop-shadow(0 0 8px rgba(255,215,0,0.35));
        cursor: pointer; transition: transform .15s ease, box-shadow .15s ease, background .15s ease; position: relative; overflow: hidden; transform: translateZ(0);
      }
      .btn.btn-primary:hover { background: #F8D200; }
      .btn.btn-primary:active { transform: translateY(0); box-shadow: 0 4px 14px rgba(0,0,0,.28); }
      .btn.btn-primary::before{
        content:""; position:absolute; inset:0;
        background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.35) 45%, transparent 55%) no-repeat;
        background-size: 200% 100%; mix-blend-mode: screen; animation: sheen 2.4s linear infinite;
      }
      @keyframes sheen{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }

      .chipRow{ display:flex; align-items:center; gap:8px; color:#CFE0FF; margin-bottom:6px; }
      .chip{ font-size:12px; padding:5px 8px; border-radius:999px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12); }
      .dot{ opacity:.4; }
      .chipTitle{ font-weight:700; letter-spacing:.2px; }

      .chatCard { padding: 0; display: flex; flex-direction: column; overflow: hidden; border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.10);
        background: radial-gradient(1200px 400px at 20% -20%, rgba(255,255,255,0.06), transparent 60%), rgba(255,255,255,0.03);
      }
      .chatCard .panelTitle { margin: 0; padding: 16px 18px 8px; font-size: 16px; font-weight: 800; letter-spacing: .6px; color: var(--gold); }
      .list { flex: 1; overflow-y: auto; padding: 8px 16px 16px; scroll-behavior: smooth; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; max-height: 56vh; }
      .row { display:flex; gap:12px; margin:10px 4px; } .row.me { justify-content: flex-end; }
      .avatar { font-size: 20px; line-height: 1; margin-top: 4px; }
      .bubble { max-width: 62ch; padding: 14px 16px; border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; background: rgba(255,255,255,0.06); color: var(--white); line-height: 1.6; font-size: 15.5px; box-shadow: 0 3px 10px rgba(0,0,0,0.18); }
      .bubble.user { background: #FFE169; color: #0D1B2A; border-color: #FFE169; }
      .tag { font-size: 11px; font-weight: 800; margin-bottom: 6px; opacity:.7; } .row.me .tag { color: #0D1B2A; opacity:.85; }
      .msg { white-space: pre-wrap; }

      .composer { display:flex; gap:10px; align-items:flex-end; padding: 12px; border-top: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.25); }
      .textArea { flex: 1; min-height: 84px; border: 1px solid #1E3448; border-radius: 12px; padding: 12px 14px; font-size: 15px; background: #0F2435; color: var(--white); outline: none; }
      .textArea:focus { border-color: var(--gold); }

      .dots { display:inline-flex; gap:8px; align-items:center; }
      .dots span { width:6px; height:6px; background: var(--gold); border-radius:50%; opacity:.35; animation: blink 1.2s infinite ease-in-out; }
      .dots span:nth-child(2){ animation-delay:.15s } .dots span:nth-child(3){ animation-delay:.3s }
      @keyframes blink { 0%,80%,100%{opacity:.25} 40%{opacity:1} }

      .fomoLine { text-align:center; font-weight:800; margin: 12px 0 6px; font-size:15px; color: rgba(255,255,255,0.86); }

      @media (max-width: 560px) {
        .wrap { margin: 16px auto 48px; padding: 0 16px; }
        .chatCard .panelTitle { padding: 14px 14px 6px; }
        .list { padding: 6px 10px 12px; max-height: 52vh; }
      }
    `}</style>
  )
}
