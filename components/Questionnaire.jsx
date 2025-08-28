// components/Questionnaire.jsx — White Theme • Wish → Block → Micro • Supabase save
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../src/supabaseClient'

const GenieLang = {
  questPrompts: {
    wish: "What’s the outcome you’re chasing? Say it like you mean it.",
    block: "What’s blocking you? Drop the excuse in one line.",
    micro: "What’s 1 micro-move you can make today? Something small.",
  },
  rewards: [
    "YES! That’s the one. Door unlocked.",
    "Love it. The signal’s clear — time to move.",
    "Locked in. You're ready. Execute time.",
    "Noted. The window’s open. Step through."
  ],
}

const todayStr = () => new Date().toISOString().slice(0,10)

export default function Questionnaire({ onDone, firstName='Friend', vibe=null, initial=null }) {
  const [session, setSession] = useState(null)
  const [wish, setWish]   = useState(initial?.wish  || '')
  const [block, setBlock] = useState(initial?.block || '')
  const [micro, setMicro] = useState(initial?.micro || '')
  const [saving, setSaving] = useState(false)
  const canSubmit = wish.trim() && micro.trim()

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data?.session || null) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (alive) setSession(s) })
    return () => { alive = false; sub?.subscription?.unsubscribe() }
  }, [])

  async function saveWish() {
    if (!canSubmit || saving) return
    setSaving(true)
    const userId = session?.user?.id || null
    const payload = {
      // generic fields we keep in memory regardless of table shape
      wish: wish.trim(),
      block: block.trim(),
      micro: micro.trim(),
      vibe: vibe || null,
      date: todayStr(),
    }

    // Try WISHES first
    try {
      const toWishes = {
        user_id: userId,
        title: payload.wish,
        summary: payload.block || null,
        micro: payload.micro || null,
        vibe: payload.vibe,
      }
      const { data, error } = await supabase
        .from('wishes')
        .insert(toWishes)
        .select('id, title, summary, micro, vibe, created_at')
        .single()

      if (error) throw error

      const newWish = {
        id: data.id,
        title: data.title,
        summary: data.summary,
        micro: data.micro,
        vibe: data.vibe,
        created_at: data.created_at,
      }
      setSaving(false)
      onDone?.(newWish)
      return
    } catch (_err) {
      // Fall back to DAILY_ENTRIES (common in your older builds)
    }

    try {
      const toEntries = {
        user_id: userId,
        intention: payload.wish,
        focus_area: payload.block || null,
        micro: payload.micro || null,      // ok to store even if column doesn’t exist; PG will ignore if not present
        vibe: payload.vibe,                // same note
        created_at: new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from('daily_entries')
        .insert(toEntries)
        .select('id, intention, focus_area, created_at')
        .single()

      if (error) throw error

      const newWish = {
        id: data.id,
        title: data.intention,
        summary: data.focus_area,
        micro: payload.micro,
        vibe: payload.vibe,
        created_at: data.created_at,
      }
      setSaving(false)
      onDone?.(newWish)
    } catch (err) {
      console.error('Save failed:', err?.message || err)
      setSaving(false)
      alert('The lamp flickered while saving. Try again.')
    }
  }

  return (
    <div className="q-wrap">
      <div className="q-card">
        <div className="q-head">
          <div className="q-eyebrow">Your Personal AI Genie</div>
          <h2 className="q-title">What’s the play today, {firstName}?</h2>
          <p className="q-sub">This is your daily portal to manifest your dreams into reality.</p>
        </div>

        <label className="q-label">{GenieLang.questPrompts.wish}</label>
        <textarea
          className="q-textarea"
          rows={3}
          placeholder="One line. No fluff."
          value={wish}
          onChange={e=>setWish(e.target.value)}
        />

        <label className="q-label">{GenieLang.questPrompts.block}</label>
        <textarea
          className="q-textarea"
          rows={2}
          placeholder="Say the snag. Simple + true."
          value={block}
          onChange={e=>setBlock(e.target.value)}
        />

        <label className="q-label">{GenieLang.questPrompts.micro}</label>
        <input
          className="q-input"
          placeholder="Send it. Start it. Ship it."
          value={micro}
          onChange={e=>setMicro(e.target.value)}
        />

        <button
          className={`q-btn ${!canSubmit || saving ? 'q-btn--disabled' : ''}`}
          disabled={!canSubmit || saving}
          onClick={saveWish}
        >
          {saving ? 'Locking it in…' : 'Lock it in →'}
        </button>
        <div className="q-reward">{GenieLang.rewards[Math.floor(Math.random()*GenieLang.rewards.length)]}</div>
      </div>

      {/* LIGHT CSS */}
      <style jsx>{`
        .q-wrap {
          padding: 18px;
          background: #fff;
        }
        .q-card {
          max-width: 980px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.06);
          padding: 20px;
        }
        .q-head { margin-bottom: 6px; }
        .q-eyebrow {
          font-size: 12px; letter-spacing: .08em; text-transform: uppercase;
          color: #64748b; font-weight: 800; margin-bottom: 4px;
        }
        .q-title { margin: 0; font-size: 22px; font-weight: 900; color: #0f172a; }
        .q-sub { margin: 6px 0 12px; color: #475569; }

        .q-label { display:block; font-weight:800; color:#0f172a; margin-top: 12px; margin-bottom: 6px; }
        .q-textarea, .q-input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          color: #0f172a;
          padding: 12px 14px;
          outline: none;
          box-shadow: 0 0 0 0 rgba(0,0,0,0);
          transition: box-shadow .15s ease, border-color .15s ease;
        }
        .q-textarea:focus, .q-input:focus {
          border-color: #111;
          box-shadow: 0 0 0 3px rgba(17,17,17,.08);
        }

        .q-btn {
          width: 100%;
          margin-top: 14px;
          padding: 14px 16px;
          border-radius: 12px;
          border: 2px solid #111;
          background: #fff;
          color: #111;
          font-weight: 900;
          cursor: pointer;
          min-height: 58px;
          box-shadow: 0 6px 0 #111;
          transition: transform .12s ease, box-shadow .2s ease, opacity .2s ease;
        }
        .q-btn:active { transform: translateY(2px); box-shadow: 0 4px 0 #111; }
        .q-btn--disabled { opacity: .6; cursor: not-allowed; }
        .q-reward { margin-top: 10px; font-size: 13px; color: #64748b; }
      `}</style>
    </div>
  )
}
