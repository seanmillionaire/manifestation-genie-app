import { useEffect, useState } from 'react'
import { supabase } from '../src/supabaseClient'

export default function Chat() {
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(null) // null=checking, true/false=result
  const [messages, setMessages] = useState([]);

  async function handleSend(e) {
    e.preventDefault();
    const input = e.target.prompt.value.trim();
    if (!input) return;

    // 1) show your message
    const next = [...messages, { role: 'user', content: input }];
    setMessages(next);
    e.target.reset();

    // 2) ask the server
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: next })
    });
    const data = await r.json();

    // 3) show Genie reply
    setMessages([...next, { role: 'assistant', content: data.reply }]);
  }

  // get auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // check allowlist by email
  useEffect(() => {
    async function run() {
      if (!session?.user?.email) return
      const { data, error } = await supabase
        .from('allowlist')
        .select('status')
        .eq('email', session.user.email)
        .maybeSingle()
      if (error) {
        console.error(error)
        setAllowed(false)
      } else {
        setAllowed(data?.status === 'active')
      }
    }
    run()
  }, [session])

  if (!session) return <div style={{padding:20}}><p>Not logged in.</p><a href="/login">Go to Login</a></div>
  if (allowed === null) return <div style={{padding:20}}>Checking access…</div>
  if (!allowed) {
    return (
      <div style={{padding:20}}>
        <h2>Access inactive</h2>
        <p>Your email isn’t active for Manifestation Genie.</p>
        <a href="U7Z5m">Get Access</a>
      </div>
    )
  }

  // ... keep your imports and gating logic exactly as-is above

  return (
    <div style={{maxWidth:800, margin:'40px auto', fontFamily:'Inter, system-ui'}}>
      <h1>Manifestation Genie</h1>
      <p>Welcome, {session.user.email}</p>

      <div style={{border:'1px solid #ddd', padding:16, borderRadius:8}}>
        <div id="chat" style={{minHeight:200, marginBottom:12}}>
          {messages?.map((m, i) => (
            <p key={i}><strong>{m.role === 'user' ? 'You' : 'Genie'}:</strong> {m.content}</p>
          ))}
        </div>

        <form onSubmit={handleSend}>
          <input
            type="text"
            name="prompt"
            placeholder="Type your message..."
            style={{width:'100%', padding:12}}
            required
          />
          <button type="submit" style={{marginTop:8, padding:'8px 12px'}}>Send</button>
        </form>
      </div>

      <button style={{marginTop:16}} onClick={() => supabase.auth.signOut()}>Logout</button>
    </div>
  )
}
