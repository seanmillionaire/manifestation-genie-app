// /pages/login.js — Light Theme Polished Login
import { useState } from 'react'
import { supabase } from '../src/supabaseClient'

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
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
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
  

      <section className="login-card">
        {!sent ? (
          <>
            <h2 className="panelTitle">Sign in to the portal</h2>
            <form onSubmit={handleSubmit} className="login-form" aria-label="Email sign in form">
              <label htmlFor="email" className="label">Your Email</label>
              <input
                id="email"
                type="email"
                className="textInput"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sending}
                required
                autoFocus
                autoComplete="email"
              />
              {error && <div className="error">{error}</div>}

              <button type="submit" className="btn btn-primary full" disabled={sending || !email.trim()}>
                {sending ? 'Sending magic link…' : 'Send magic link'}
              </button>
            </form>
            <p className="microNote">We’ll email you a secure sign‑in link. No password needed.</p>
          </>
        ) : (
          <>
            <h2 className="panelTitle">Check your email</h2>
            <p className="sub">We sent a magic sign‑in link to <b>{email}</b>. Open it on this device to continue.</p>
          </>
        )}
      </section>

      <Style />
    </div>
  )
}

function Style(){
  return (
    <style jsx global>{`
      /* Layout */
      .login-wrap{ max-width:980px; margin:72px auto 96px; padding:0 24px; }
      .login-hero{ text-align:center; margin-bottom:22px; }
      .login-logo{ height:56px; width:auto; display:block; margin:0 auto 10px; }
      .login-title{ margin:0 auto; max-width:62ch; font-size:20px; line-height:1.45; color:var(--text-dim); font-weight:600; }

      /* Card */
      .login-card{
        background:#fff;
        border:1px solid var(--border);
        border-radius:20px;
        box-shadow:var(--shadow-lg);
        padding:36px 32px 30px;
        display:flex;
        flex-direction:column;
        align-items:center;
        text-align:center;
      }

      .panelTitle{
        margin:0 0 16px;
        font-size:15px;
        line-height:1;
        font-weight:900;
        text-transform:uppercase;
        letter-spacing:.12em;
        color:#B58900; /* subtle golden heading */
      }

      /* Form */
      .login-form{ width:100%; max-width:520px; margin:6px auto 0; }
      .label{ display:block; text-align:left; margin:0 0 6px; color:var(--muted); font-size:13px; font-weight:700; letter-spacing:.2px; }
      .textInput{
        width:100%;
        background:#fff;
        color:var(--text);
        border:1px solid var(--border);
        border-radius:12px;
        padding:14px 16px;
        outline:none;
        box-shadow:var(--shadow-sm);
        transition:border-color .15s, box-shadow .15s;
      }
      .textInput::placeholder{ color:#9aa5b1; }
      .textInput:focus{
        border-color: var(--ring);
        box-shadow: 0 0 0 3px rgba(148,163,184,.25);
      }

      .btn{
        display:inline-flex; align-items:center; justify-content:center;
        padding:14px 18px;
        border-radius:12px;
        border:2px solid #000;
        font-weight:800; letter-spacing:.2px;
        cursor:pointer; text-decoration:none;
        transition:transform .05s ease, filter .2s ease, box-shadow .2s;
        margin-top:14px;
      }
      .btn:active{ transform:translateY(1px); }
      .btn[disabled]{ opacity:.6; cursor:not-allowed; }
      .btn.full{ width:100%; }

      .btn-primary{
        background: var(--primary);
        color: var(--primary-text);
        box-shadow: var(--shadow-lg);
      }
      .btn-primary:hover{ filter:brightness(.98); }

      .sub{ margin:12px auto 0; font-size:15px; color:var(--text-dim); max-width:60ch; line-height:1.55; }
      .microNote{ margin:14px auto 0; font-size:13px; color:var(--muted); }

      .error{
        background:#fff5f5;
        border:1px solid #fecaca;
        color:#991b1b;
        border-radius:10px;
        padding:10px 12px;
        font-size:14px;
        text-align:left;
        margin-top:10px;
      }

      .login-footer{
        text-align:center;
        margin-top:22px;
        color:var(--muted);
      }
      .login-footer a{ color:var(--muted); text-decoration:none; }
      .login-footer a:hover{ text-decoration:underline; }

      @media (max-width:560px){
        .login-wrap{ margin:48px auto 72px; padding:0 16px; }
        .login-title{ font-size:18px; }
        .login-card{ padding:28px 18px 24px; border-radius:16px; }
      }
    `}</style>
  )
}
