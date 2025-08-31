
// /pages/login.js — Light Theme Polished Login (with Genie Bible copy)
import { useState } from 'react'
import { supabase } from '../src/supabaseClient'
import { copy } from '../src/genieCopy'
import { setFirstName, getFirstName } from '../src/flowState'

export default function Login() {
  const [email, setEmail] = useState('')
  const [firstName, setName] = useState(getFirstName() || '')
  const [vow, setVow] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !vow) return
    if (firstName && firstName.trim()) { setFirstName(firstName.trim()) }
    setSending(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      })
      if (error) throw error
      setSent(true)
    } catch (err) {
      setError(err?.message || 'Something went wrong. Try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="lamp-intro">
          {copy.login.lampIntro().split('\n').map((l,i)=>(<p key={i}>{l}</p>))}
        </div>

        <label className="vow">
          <input type="checkbox" checked={vow} onChange={e=>setVow(e.target.checked)} />
          <span>{copy.login.vowLabel()}</span>
        </label>

        <div className="name-field">
          <label>{copy.login.namePrompt()}</label>
          <input
            value={firstName}
            onChange={e=>setName(e.target.value)}
            placeholder="Your first name"
            aria-label="First name"
          />
        </div>

        <form onSubmit={handleSubmit} className="email-form">
          <label className="email-label">{copy.login.emailPrompt()}</label>
          <input
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="you@magic.com"
            required
          />
          <button type="submit" disabled={!email.trim() || !vow || sending} className="cta">
            {copy.login.cta(sent)}
          </button>
        </form>

        {error && <div className="error">{error}</div>}
        <p className="disclaimer">{copy.login.disclaimer()}</p>
      </div>

      <p className="login-footer">{copy.login.footer()}</p>

      <style jsx>{`
        :root {
          --bg: #f9fafb;
          --card: #ffffff;
          --ink: #0b1020;
          --muted: rgba(10, 20, 40, .66);
          --ring: rgba(0, 0, 0, 0.08);
          --brand: #7c3aed;
        }
        .login-wrap{
          min-height:100vh;
          display:flex;
          flex-direction:column;
          justify-content:center;
          align-items:center;
          background:radial-gradient(60% 60% at 50% 0%, #ffffff, var(--bg));
          padding:32px 16px;
        }
        .login-card{
          width:100%;
          max-width:460px;
          background:var(--card);
          border:1px solid var(--ring);
          border-radius:20px;
          padding:28px 24px;
          box-shadow:0 10px 30px rgba(0,0,0,0.06);
        }
        .lamp-intro p{
          margin:0 0 4px 0;
          font-size:18px;
          line-height:1.35;
        }
        .vow{
          display:flex; align-items:center; gap:10px;
          margin-top:12px; font-size:14px; color:var(--muted);
        }
        .vow input{ width:18px; height:18px; }
        .name-field{ margin-top:14px; }
        .name-field label{ display:block; font-size:14px; color:var(--muted); margin-bottom:6px; }
        .name-field input{
          width:100%; padding:12px 14px; border-radius:12px; border:1px solid var(--ring); outline:none;
        }
        .email-form{ margin-top:16px; }
        .email-label{ display:block; font-size:14px; color:var(--muted); margin-bottom:6px; }
        .email-form input{
          width:100%; padding:12px 14px; border-radius:12px; border:1px solid var(--ring); outline:none;
        }
        .cta{
          margin-top:12px; width:100%; padding:12px 14px; border-radius:12px; border:1px solid var(--ring);
          background: var(--brand); color:#fff; cursor:pointer; font-weight:600;
        }
        .cta[disabled]{ opacity:.6; cursor:not-allowed; }
        .error{ margin-top:12px; color:#b91c1c; font-size:13px; }
        .disclaimer{ margin-top:14px; color:var(--muted); font-size:12px; }
        .login-footer{ margin-top:22px; color:var(--muted); font-size:12px; }
      `}</style>
    </div>
  )
}
