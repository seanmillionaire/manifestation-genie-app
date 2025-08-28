// components/Questionnaire.jsx — Genie Minimal Questionnaire (from chat.js)
import { useState } from 'react'

const todayStr = () => new Date().toISOString().slice(0,10)

const GenieLang = {
  questPrompts: {
    wish: "What’s the outcome you’re chasing? Say it like you mean it.",
    block: "What’s blocking you? Drop the excuse in one line.",
    micro: "What’s 1 micro-move you can make today? Something small."
  },
  rewards: [
    "YES! That’s the one. Door unlocked.",
    "Love it. The signal’s clear — time to move.",
    "Locked in. You're ready. Execute time.",
    "Noted. The window’s open. Step through."
  ],
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export default function Questionnaire({ initial, onComplete, vibe, firstName='Friend' }) {
  const [wish, setWish]   = useState(initial?.wish || "")
  const [block, setBlock] = useState(initial?.block || "")
  const [micro, setMicro] = useState(initial?.micro || "")

  const canSubmit = wish.trim() && micro.trim()

  return (
    <>
      <div style={styles.portalHeader}>
        <h1 style={styles.portalTitle}>Your Personal AI Genie ✨</h1>
        <p style={styles.portalSubtitle}>This is your daily portal to manifest your dreams into reality.</p>
      </div>

      <div style={styles.card}>
        <h3 style={styles.h3}>What’s the play today, {firstName}?</h3>

        <p style={styles.subtle}>{GenieLang.questPrompts.wish}</p>
        <textarea
          value={wish}
          onChange={e=>setWish(e.target.value)}
          placeholder="One line. No fluff."
          style={styles.textarea}
          rows={3}
        />

        <p style={{...styles.subtle, marginTop:16}}>{GenieLang.questPrompts.block}</p>
        <textarea
          value={block}
          onChange={e=>setBlock(e.target.value)}
          placeholder="Say the snag. Simple + true."
          style={styles.textarea}
          rows={2}
        />

        <p style={{...styles.subtle, marginTop:16}}>{GenieLang.questPrompts.micro}</p>
        <input
          value={micro}
          onChange={e=>setMicro(e.target.value)}
          placeholder="Send it. Start it. Ship it."
          style={styles.input}
        />

        <button
          style={{...styles.btn, marginTop:16, opacity: canSubmit ? 1 : 0.6, cursor: canSubmit ? 'pointer' : 'not-allowed'}}
          disabled={!canSubmit}
          onClick={() => onComplete({
            wish: wish.trim(),
            block: block.trim(),
            micro: micro.trim(),
            vibe,
            date: todayStr()
          })}
        >
          Lock it in →
        </button>
        <p style={{...styles.mini, marginTop:12}}>{pick(GenieLang.rewards)}</p>
      </div>
    </>
  )
}

const styles = {
  portalHeader: { textAlign:'left', marginBottom:18 },
  portalTitle: { fontSize:28, fontWeight:900, margin:0, color:'#111', letterSpacing:.3 },
  portalSubtitle: { fontSize:16, opacity:.9, marginTop:6, color:'#333' },

  card: {
    background:'#fff',
    border:'1px solid rgba(0,0,0,0.08)',
    borderRadius:18,
    padding:24,
    boxShadow:'0 6px 22px rgba(0,0,0,0.08)',
  },

  h3: { marginTop:0, fontSize:20, fontWeight:850, color:'#111' },
  subtle: { fontSize:14, opacity:.8, lineHeight:1.45, color:'#444' },
  mini: { fontSize:13, opacity:.7, color:'#666' },

  btn: {
    padding:'12px 16px',
    borderRadius:14,
    border:'0',
    background:'#ffd600',
    color:'#111',
    fontWeight:900,
    cursor:'pointer',
    letterSpacing:.2,
    boxShadow:'0 0 12px rgba(255,214,0,0.35)'
  },

  input: {
    width:'100%',
    padding:'12px 14px',
    borderRadius:12,
    border:'1px solid rgba(0,0,0,0.15)',
    background:'#fff',
    color:'#111',
    outline:'none',
    marginTop:4,
  },
  textarea: {
    width:'100%',
    padding:'12px 14px',
    borderRadius:12,
    border:'1px solid rgba(0,0,0,0.15)',
    background:'#fff',
    color:'#111',
    outline:'none',
    resize:'vertical',
    marginTop:4,
  },
}
