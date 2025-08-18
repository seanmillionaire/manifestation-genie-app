import { useEffect, useState } from 'react'
import { supabase } from '../src/supabaseClient'

export default function Chat() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    // On load, get session:
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    // Listen for login/logout:
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!session) {
    return (
      <div style={{maxWidth: 480, margin:'60px auto', fontFamily: 'Inter, system-ui'}}>
        <p>You’re not logged in.</p>
        <a href="/login">Go to Login</a>
      </div>
    )
  }

  return (
    <div style={{maxWidth: 800, margin:'40px auto', fontFamily: 'Inter, system-ui'}}>
      <h1>Manifestation Genie</h1>
      <p>Welcome, {session.user.email}</p>

      {/* === Embed your chatbot widget here (for week 1) === */}
      {/* Example placeholder: */}
      <div style={{border:'1px solid #ddd', padding:16, borderRadius:8}}>
        <p>🔮 Your chat will appear here.</p>
        {/* Example: <script src="https://your-bot-provider/embed.js"></script> */}
        {/* Example: <div id="mg-bot" data-user={session.user.id}></div> */}
      </div>

      {/* Simple logout */}
      <button style={{marginTop:16}} onClick={() => supabase.auth.signOut()}>Logout</button>
    </div>
  )
}
