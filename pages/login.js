// pages/login.js — Light Theme Login (aligned with global header)
import { useState } from 'react'
import { supabase } from '../src/supabaseClient'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) return
    setSending(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined }
      })
      if (error) throw error
      setSent(true)
    } catch (e) {
      setError(e.message || 'Could not send magic link.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main style={{minHeight:'100vh', background:'#fff', color:'#111'}}>
      <div style={{maxWidth:520, margin:'0 auto', padding:'48px 16px'}}>
        <div style={{textAlign:'center', marginBottom:18}}>
          <img src="/logo.png" alt="Manifestation Genie" style={{height:40}} />
        </div>

        <section style={{
          border:'1px solid #e5e7eb', borderRadius:16, padding:20,
          boxShadow:'0 12px 40px rgba(15,23,42,.08)'
        }}>
          <h1 style={{margin:'0 0 8px'}}>Welcome back</h1>
          <p style={{margin:'0 0 12px', color:'#475569'}}>Sign in via magic link.</p>

          {sent ? (
            <div style={{padding:12, border:'1px solid #e5e7eb', borderRadius:10, background:'#fafafa'}}>
              We’ve sent a link to <b>{email}</b>. Check your inbox (and spam).
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{display:'grid', gap:10}}>
              <label style={{fontSize:14, color:'#334155'}}>Email</label>
              <input
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sending}
                required
                autoFocus
                autoComplete="email"
                style={{padding:'12px 14px', border:'1px solid #e5e7eb', borderRadius:10}}
              />
              {error && <div className="error">{error}</div>}

              <button type="submit" className="btn btn-primary full" disabled={sending || !email.trim()}>
                {sending ? 'Sending magic link…' : 'Send magic link'}
              </button>
            </form>
          )}

          <div style={{marginTop:12, fontSize:13}}>
            New here? <Link href="/onboard" className="link">Meet the Genie</Link>
          </div>
        </section>
      </div>
    </main>
  )
}
