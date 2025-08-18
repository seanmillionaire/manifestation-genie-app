// pages/chat.js
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'

export default function Chat() {
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(null)
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState(null)

  const inputRef = useRef(null)
  const listRef  = useRef(null)

  const PAYHIP_URL = 'https://payhip.com/YOUR_PRODUCT' // <-- set real link

  // ---- auth session ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // ---- allowlist gate ----
  useEffect(() => {
    async function run() {
      if (!session?.user?.email) return
      const { data, error } = await supabase
        .from('allowlist')
        .select('status')
        .eq('email', session.user.email)
        .maybeSingle()
      setAllowed(!error && data?.status === 'active')
    }
    run()
  }, [session])

  // ---- create/reuse chat session; then load history ----
  useEffect(() => {
    async function bootstrap() {
      if (!allowed || !session?.user?.id) return
      const userId = session.user.id

      const { data: found } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let sid = found?.id
      if (!sid) {
        const { data: created } = await supabase
          .from('sessions')
          .insert([{ user_id: userId, title: 'Daily chat' }])
          .select('id')
          .single()
        sid = created.id
      }
      setSessionId(sid)

      const { data: rows } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('session_id', sid)
        .order('created_at', { ascending: true })
      setMessages(rows || [])
    }
    if (allowed !== null) bootstrap()
  }, [allowed, session])

  // ---- auto scroll ----
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, sending])

  async function handleSend(e) {
    e.preventDefault()
    const input = inputRef.current.value.trim()
    if (!input || sending || !sessionId || !session?.user?.id) return

    const next = [...messages, { role: 'user', content: input }]
    setMessages(next)
    inputRef.current.value = ''
    setSending(true)

    // save user msg
    await supabase.from('messages').insert([{
      session_id: sessionId, user_id: session.user.id, role: 'user', content: input
    }])

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next })
      })
      const data = await r.json()
      const reply = data.reply || '…'

      const final = [...next, { role: 'assistant', content: reply }]
      setMessages(final)

      // save assistant msg
      await supabase.from('messages').insert([{
        session_id: sessionId, user_id: session.user.id, role: 'assistant', content: reply
      }])
    } catch (err) {
      setMessages([...next, { role: 'assistant', content: 'Error contacting Genie.' }])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.form.requestSubmit()
    }
  }

  // ---- inline styles (cannot fail to load) ----
  const ui = {
    page: { background: '#0f1020', color: '#e8e9f1', minHeight: '100vh', margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial' },
    wrap: { maxWidth: 920, margin: '28px auto 40px', padding: '0 16px' },
    title: { fontSize: 34, margin: '0 0 6px', background: 'linear-gradient(90deg,#8b5cf6,#22d3ee)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' },
    sub: { color: '#a6a8bf', margin: '6px 0 16px', fontSize: 14 },
    card: { background: '#16172a', border: '1px solid #21233a', borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,.25)', overflow: 'hidden' },
    list: { height: '56vh', minHeight: 300, overflowY: 'auto', padding: '14px 12px 0' },
    row: { display: 'flex', gap: 10, margin: '10px 6px' },
    avatar: { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1d1f33', border: '1px solid #21233a', borderRadius: '50%', flex: '0 0 28px', fontSize: 14 },
    bubbleUser: { maxWidth: '72%', padding: '10px 12px', borderRadius: 14, background: 'linear-gradient(180deg,#8b5cf6,#6d28d9)', color: '#fff', lineHeight: 1.45 },
    bubbleGenie:{ maxWidth: '72%', padding: '10px 12px', borderRadius: 14, background: '#262842', border: '1px solid #21233a', lineHeight: 1.45 },
    tag: { fontSize: 11, opacity: .7, marginBottom: 4 },
    composer: { display: 'flex', gap: 10, padding: 12, borderTop: '1px solid #21233a', position: 'sticky', bottom: 0, background: '#16172a' },
    input: { flex: 1, resize: 'none', border: '1px solid #21233a', background: '#0f1022', color: '#e8e9f1', borderRadius: 10, padding: '10px 12px', outline: 'none' },
    button: { background: 'linear-gradient(90deg,#8b5cf6,#22d3ee)', color: '#0b0c18', border: 0, borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontWeight: 700 },
    logoutBar: { display: 'flex', justifyContent: 'flex-end', marginTop: 10 },
    ghostBtn: { background: 'transparent', color: '#a6a8bf', border: '1px solid #21233a', padding: '8px 12px', borderRadius: 10, cursor: 'pointer' },
    centerCard:{ background:'#16172a', border:'1px solid #21233a', borderRadius:12, padding:40, textAlign:'center' },
  }

  // ---- gates ----
  if (!session) {
    return (
      <div style={ui.page}>
        <div style={ui.wrap}>
          <div style={ui.centerCard}>
            <p>Not logged in.</p>
            <a href="/login" style={{color:'#8b5cf6'}}>Go to Login</a>
          </div>
        </div>
      </div>
    )
  }
  if (allowed === null) {
    return (
      <div style={ui.page}>
        <div style={ui.wrap}>
          <div style={ui.centerCard}><p>Checking access…</p></div>
        </div>
      </div>
    )
  }
  if (!allowed) {
    return (
      <div style={ui.page}>
        <div style={ui.wrap}>
          <div style={ui.centerCard}>
            <h2>Access inactive</h2>
            <p>Your email isn’t active for Manifestation Genie.</p>
            <a href={PAYHIP_URL} style={{color:'#8b5cf6'}}>Get Access</a>
          </div>
        </div>
      </div>
    )
  }

  // ---- main UI ----
  return (
    <div style={ui.page}>
      <div style={ui.wrap}>
        <h1 style={ui.title}>Manifestation Genie</h1>
        <div style={ui.sub}>Welcome, {session.user.email}</div>

        <div style={ui.card}>
          <div style={ui.list} ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} style={{...ui.row, justifyContent: m.role==='user' ? 'flex-end' : 'flex-start'}}>
                {m.role === 'assistant' && <div style={ui.avatar}>🔮</div>}
                <div style={m.role==='user' ? ui.bubbleUser : ui.bubbleGenie}>
                  <div style={ui.tag}>{m.role === 'user' ? 'You' : 'Genie'}</div>
                  <div style={{whiteSpace:'pre-wrap'}}>{m.content}</div>
                </div>
                {m.role === 'user' && <div style={ui.avatar}>🧑</div>}
              </div>
            ))}
            {sending && (
              <div style={{...ui.row}}>
                <div style={ui.avatar}>🔮</div>
                <div style={ui.bubbleGenie}><div style={ui.tag}>Genie</div><div>…</div></div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} style={ui.composer}>
            <textarea
              ref={inputRef}
              name="prompt"
              placeholder="Type your message… (Shift+Enter for a newline)"
              rows={2}
              onKeyDown={handleKeyDown}
              disabled={sending}
              style={ui.input}
            />
            <button type="submit" disabled={sending} style={{...ui.button, opacity: sending ? .7 : 1}}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </form>
        </div>

        <div style={ui.logoutBar}>
          <button style={ui.ghostBtn} onClick={() => supabase.auth.signOut()}>Logout</button>
        </div>
      </div>
    </div>
  )
}
