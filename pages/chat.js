// pages/chat.js — Manifestation Genie (White Theme + Magical Vibe Select)
// Flow: welcome → vibe → resumeNew → questionnaire → checklist → chat
// Supabase name integration + localStorage persistence (per session)

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'
import Questionnaire from '../components/Questionnaire' // if you use it

/* =========================
   Config / Constants
   ========================= */
const LOGO_SRC = 'https://storage.googleapis.com/mixo-sites/images/file-a7eebac5-6af9-4253-bc71-34c0d455a852.png' // your logo
const STORE_URL = 'https://hypnoticmeditations.ai'

const GenieLang = {
  greetings: [
    "The lamp glows… your Genie is here. ✨ What’s stirring in your heart today, {firstName}?",
    "Rub the lamp 🔮 — let’s spark some magic, {firstName}.",
    "The stars whispered your name, {firstName}… shall we begin?",
    "The portal is open 🌌 — step inside, {firstName}."
  ],
  vibePrompt: "What’s your vibe today, {firstName}? Choose the current you want to surf ⚡",
  resumeOrNew: "Continue your last wish — or spark a fresh one?",
  resumeLabel: "Continue last wish",
  newLabel: "Start a new wish",
  checklistTitle: "Quick Activation Checklist ✅",
}

/* =========================
   Helpers
   ========================= */
const todayStr = () => new Date().toISOString().slice(0,10)
function pick(arr) { return arr[Math.floor(Math.random()*arr.length)] }

/* =========================
   Logo Header (persistent)
   ========================= */
function LogoHeader() {
  return (
    <div style={{
      width:'100%', display:'flex', alignItems:'center', justifyContent:'center',
      padding:'14px 12px', borderBottom:'1px solid #e5e7eb', background:'#fff',
      position:'sticky', top:0, zIndex:50
    }}>
      <img src={LOGO_SRC} alt="Manifestation Genie" style={{height:36, width:'auto'}} />
    </div>
  )
}

/* =========================
   Typewriter
   ========================= */
function useTypewriter(text, speed=28) {
  const [out, setOut] = useState('')
  useEffect(() => {
    let i = 0
    setOut('')
    const id = setInterval(() => {
      i++
      setOut(text.slice(0,i))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return out
}

/* =========================
   Ripple helper (button click)
   ========================= */
function addRipple(e) {
  const btn = e.currentTarget
  const rect = btn.getBoundingClientRect()
  const ripple = document.createElement('span')
  const size = Math.max(rect.width, rect.height)
  ripple.style.position = 'absolute'
  ripple.style.left = `${e.clientX - rect.left - size/2}px`
  ripple.style.top = `${e.clientY - rect.top - size/2}px`
  ripple.style.width = ripple.style.height = `${size}px`
  ripple.style.borderRadius = '50%'
  ripple.style.pointerEvents = 'none'
  ripple.style.background = 'rgba(17,17,17,0.08)'
  ripple.style.transform = 'scale(0)'
  ripple.style.opacity = '1'
  ripple.style.transition = 'transform 500ms ease, opacity 600ms ease'
  btn.appendChild(ripple)
  requestAnimationFrame(() => { ripple.style.transform = 'scale(1)' })
  setTimeout(() => { ripple.style.opacity = '0'; ripple.remove() }, 600)
}

/* =========================
   Twinkle Background
   ========================= */
function TwinkleBackdrop() {
  return (
    <div className="mg-stars" aria-hidden="true">
      <style jsx>{`
        .mg-stars {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background:
            radial-gradient(1200px 800px at 50% -10%, rgba(168, 85, 247, 0.12), transparent 60%),
            radial-gradient(800px 600px at 90% 10%, rgba(234, 179, 8, 0.12), transparent 60%),
            radial-gradient(700px 500px at 10% 10%, rgba(14, 165, 233, 0.10), transparent 60%),
            #ffffff;
          overflow: hidden;
        }
        .mg-stars::before,
        .mg-stars::after {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(2px 2px at 20% 30%, rgba(17,17,17,0.2), transparent 40%),
            radial-gradient(2px 2px at 40% 80%, rgba(17,17,17,0.2), transparent 40%),
            radial-gradient(1.5px 1.5px at 70% 20%, rgba(17,17,17,0.15), transparent 40%),
            radial-gradient(1.5px 1.5px at 85% 60%, rgba(17,17,17,0.15), transparent 40%),
            radial-gradient(1.5px 1.5px at 15% 70%, rgba(17,17,17,0.15), transparent 40%);
          animation: twinkle 6s linear infinite;
        }
        .mg-stars::after {
          animation-delay: 3s;
          opacity: .7;
        }
        @keyframes twinkle {
          0%   { opacity: .15; transform: translateY(0) }
          50%  { opacity: .35; transform: translateY(-6px) }
          100% { opacity: .15; transform: translateY(0) }
        }
      `}</style>
    </div>
  )
}

/* =========================
   Vibe Select (MAGICAL)
   ========================= */
function VibeSelect({ firstName, onSelect }) {
  const prompt = useMemo(() => GenieLang.vibePrompt.replace('{firstName}', firstName || 'friend'), [firstName])
  const typed = useTypewriter(`🧞 ${prompt}`, 24)
  const cardRef = useRef(null)
  const [entered, setEntered] = useState(false)
  const [launchEmoji, setLaunchEmoji] = useState(null)
  const [emojiPos, setEmojiPos] = useState({x:0, y:0})

  useEffect(() => {
    // ensure scroll top + entrance
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const t = setTimeout(() => setEntered(true), 50)
    return () => clearTimeout(t)
  }, [])

  function handlePick(vibe, emoji) {
    setLaunchEmoji(emoji)
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      setEmojiPos({ x: rect.left + rect.width/2, y: rect.top + rect.height/2 })
    }
    setTimeout(() => onSelect(vibe), 420) // brief float then proceed
  }

  return (
    <div className="vibe-wrap">
      <TwinkleBackdrop />
      <div ref={cardRef} className={`vibe-card ${entered ? 'entered' : ''}`}>
        <div className="aura" />
        <div className="prompt">{typed}</div>

        <div className="buttons">
          <button
            className="vibe-btn vibe-bold"
            onMouseDown={addRipple}
            onClick={(e)=>{ addRipple(e); handlePick('bold','🔥') }}
          >
            <span className="inner">🔥 Bold</span>
            <span className="shimmer" />
          </button>

          <button
            className="vibe-btn vibe-calm"
            onMouseDown={addRipple}
            onClick={(e)=>{ addRipple(e); handlePick('calm','🙏') }}
          >
            <span className="inner">🙏 Calm</span>
            <span className="shimmer" />
          </button>

          <button
            className="vibe-btn vibe-rich"
            onMouseDown={addRipple}
            onClick={(e)=>{ addRipple(e); handlePick('rich','💰') }}
          >
            <span className="inner">💰 Rich</span>
            <span className="shimmer" />
          </button>
        </div>
      </div>

      {launchEmoji && (
        <div
          className="emoji-float"
          style={{ left: emojiPos.x, top: emojiPos.y }}
        >
          {launchEmoji}
        </div>
      )}

      <style jsx>{`
        .vibe-wrap {
          position: relative;
          min-height: calc(100vh - 60px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background:#fff;
        }
        .vibe-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 720px;
          padding: 26px 24px;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 12px 40px rgba(167,139,250,0.25);
          opacity: 0;
          transform: translateY(12px) scale(.96);
          transition: opacity .5s ease, transform .6s cubic-bezier(.16,.84,.44,1);
          overflow: hidden;
        }
        .vibe-card.entered { opacity: 1; transform: translateY(0) scale(1); }

        .aura {
          position: absolute; inset: -20%; z-index: 0;
          background:
            radial-gradient(350px 220px at 20% 10%, rgba(168,85,247,.16), transparent 60%),
            radial-gradient(300px 200px at 80% 0%, rgba(234,179,8,.16), transparent 60%);
          filter: blur(20px);
          animation: auraPulse 6s ease-in-out infinite;
        }
        @keyframes auraPulse {
          0%,100% { opacity:.65; transform: scale(1) }
          50%     { opacity:.85; transform: scale(1.03) }
        }

        .prompt {
          position: relative;
          z-index: 1;
          font-size: 20px;
          line-height: 1.35;
          font-weight: 800;
          color: #0f172a;
          margin: 2px 4px 16px;
        }

        .buttons {
          position: relative; z-index: 1;
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media(min-width: 680px){
          .buttons { grid-template-columns: repeat(3, 1fr); }
        }

        .vibe-btn {
          position: relative;
          border: 2px solid #111;
          border-radius: 14px;
          background: #fff;
          cursor: pointer;
          padding: 14px 16px;
          min-height: 64px;
          overflow: hidden;
          transition: transform .12s ease, box-shadow .2s ease;
          box-shadow: 0 6px 0 #111;
        }
        .vibe-btn:active { transform: translateY(2px); box-shadow: 0 4px 0 #111; }
        .vibe-btn .inner { font-size: 17px; font-weight: 900; color: #111; }

        /* Subtle pulse */
        .vibe-btn { animation: btnPulse 3.8s ease-in-out infinite; }
        .vibe-btn:nth-child(2){ animation-delay: .6s; }
        .vibe-btn:nth-child(3){ animation-delay: 1.2s; }
        @keyframes btnPulse { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-1px) } }

        /* Shimmer sweep */
        .shimmer {
          pointer-events:none;
          position:absolute; inset:0;
          background: linear-gradient(110deg, transparent 0%, transparent 40%, rgba(17,17,17,.06) 50%, transparent 60%, transparent 100%);
          transform: translateX(-100%);
          animation: sweep 3.5s ease-in-out infinite;
        }
        @keyframes sweep {
          0% { transform: translateX(-120%) }
          60% { transform: translateX(120%) }
          100% { transform: translateX(120%) }
        }

        /* Color accents per vibe (borders/inner glow on hover) */
        .vibe-bold:hover { box-shadow: 0 10px 24px rgba(244,63,94,0.25), 0 6px 0 #111; }
        .vibe-calm:hover { box-shadow: 0 10px 24px rgba(59,130,246,0.22), 0 6px 0 #111; }
        .vibe-rich:hover { box-shadow: 0 10px 24px rgba(234,179,8,0.28), 0 6px 0 #111; }

        /* Ripple spans inserted inline */
        .vibe-btn span[style] { position:absolute; border:0; }

        /* Emoji float on select */
        .emoji-float {
          position: fixed; z-index: 60;
          font-size: 28px;
          animation: floatUp .42s cubic-bezier(.16,.84,.44,1) forwards;
        }
        @keyframes floatUp {
          0%   { transform: translate(-50%, -50%) scale(.9); opacity: 1; }
          100% { transform: translate(-50%, -120%) scale(1.3); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

/* =========================
   Resume or New Screen
   ========================= */
function ResumeOrNew({ onPick }) {
  return (
    <div className="ron-wrap">
      <TwinkleBackdrop />
      <div className="ron-card">
        <div className="title">🧞 {GenieLang.resumeOrNew}</div>
        <div className="actions">
          <button className="ron-btn" onMouseDown={addRipple} onClick={()=>onPick('resume')}>{GenieLang.resumeLabel}</button>
          <button className="ron-btn" onMouseDown={addRipple} onClick={()=>onPick('new')}>{GenieLang.newLabel}</button>
        </div>
      </div>

      <style jsx>{`
        .ron-wrap {
          position: relative; min-height: calc(100vh - 60px);
          display:flex; align-items:center; justify-content:center; padding:24px; background:#fff;
        }
        .ron-card {
          position: relative; z-index:1; width:100%; max-width:680px;
          padding: 22px; background:#fff; border:1px solid #e5e7eb; border-radius:16px;
          box-shadow: 0 12px 40px rgba(99,102,241,0.18);
        }
        .title { font-weight:900; color:#0f172a; font-size:20px; margin-bottom:14px; }
        .actions { display:grid; gap:12px; grid-template-columns:1fr; }
        @media(min-width:600px){ .actions{ grid-template-columns:1fr 1fr; } }
        .ron-btn{
          position:relative; padding:14px 16px; min-height:64px; cursor:pointer;
          border:2px solid #111; border-radius:12px; background:#fff; font-weight:900; box-shadow:0 6px 0 #111;
          transition: transform .12s ease, box-shadow .2s ease;
        }
        .ron-btn:active { transform: translateY(2px); box-shadow: 0 4px 0 #111; }
      `}</style>
    </div>
  )
}

/* =========================
   Simple Checklist (stub)
   ========================= */
function Checklist({ onDone }) {
  const [checks, setChecks] = useState([false,false,false])
  const all = checks.every(Boolean)
  function toggle(i){ setChecks(cs => cs.map((c,idx)=> idx===i ? !c : c)) }
  return (
    <div className="chk-wrap">
      <TwinkleBackdrop />
      <div className="chk-card">
        <div className="title">🪄 {GenieLang.checklistTitle}</div>
        <ul>
          <li onClick={()=>toggle(0)}>{checks[0] ? '✅' : '⬜️'} Set a clear intention</li>
          <li onClick={()=>toggle(1)}>{checks[1] ? '✅' : '⬜️'} Choose one micro-action for today</li>
          <li onClick={()=>toggle(2)}>{checks[2] ? '✅' : '⬜️'} Promise your future self one tiny step</li>
        </ul>
        <button className="primary" disabled={!all} onMouseDown={addRipple} onClick={onDone}>Enter the Chamber →</button>
      </div>

      <style jsx>{`
        .chk-wrap { position:relative; min-height:calc(100vh - 60px); display:flex; align-items:center; justify-content:center; padding:24px; background:#fff; }
        .chk-card { position:relative; z-index:1; width:100%; max-width:680px; background:#fff; border:1px solid #e5e7eb; border-radius:16px; box-shadow:0 12px 40px rgba(168,85,247,0.18); padding:22px; }
        .title { font-weight:900; color:#0f172a; font-size:20px; margin-bottom:10px; }
        ul { list-style:none; padding:0; margin: 8px 0 16px; }
        li { padding:10px 12px; border:1px solid #e5e7eb; border-radius:12px; margin-bottom:8px; font-weight:700; color:#0f172a; cursor:pointer; background:#fff; }
        .primary { width:100%; padding:14px 16px; border:2px solid #111; border-radius:12px; font-weight:900; background:#fff; box-shadow:0 6px 0 #111; cursor:pointer; min-height:58px; }
        .primary:disabled { opacity:.5; cursor:not-allowed; box-shadow:0 6px 0 #111; }
        .primary:active:not(:disabled){ transform: translateY(2px); box-shadow:0 4px 0 #111; }
      `}</style>
    </div>
  )
}

/* =========================
   Chat Console (very simple placeholder)
   (Keep your existing chat UI; this is just a clean stub to land on)
   ========================= */
function ChatConsole({ firstName }) {
  return (
    <div style={{padding:'16px', maxWidth:960, margin:'0 auto'}}>
      <div style={{
        border:'1px solid #e5e7eb', borderRadius:16, background:'#fff',
        boxShadow:'0 10px 30px rgba(0,0,0,0.06)', padding:16
      }}>
        <div style={{fontWeight:900, fontSize:18, marginBottom:10, color:'#0f172a'}}>
          🧞 {pick(GenieLang.greetings).replace('{firstName}', firstName || 'friend')}
        </div>
        <div style={{color:'#475569'}}>Ask me anything, or tell me what you’re manifesting today.</div>
      </div>
    </div>
  )
}

/* =========================
   Main Page
   ========================= */
export default function ChatPage() {
  const [session, setSession] = useState(null)
  const [firstName, setFirstName] = useState('')
  const [flow, setFlow] = useState('vibe') // 'vibe' → 'resumeNew' → 'questionnaire' → 'checklist' → 'chat'
  const [vibe, setVibe] = useState(null)

  // Load session + profile name
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session || null)
    })
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })
    return () => authListener?.subscription?.unsubscribe()
  }, [])

  useEffect(() => {
    // try local first
    const cached = localStorage.getItem('mgFirstName')
    if (cached) setFirstName(cached)
    // then profile
    if (session?.user?.id) {
      supabase.from('profiles')
        .select('first_name')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.first_name) {
            setFirstName(data.first_name)
            localStorage.setItem('mgFirstName', data.first_name)
          }
        })
    }
  }, [session])

  // Ensure we start at Vibe right after login
useEffect(() => {
  if (session && !localStorage.getItem('mgHasEntered')) {
    setFlow('vibe')
    localStorage.setItem('mgHasEntered', 'true')
  }
}, [session])


  function handleVibeSelect(v) {
    setVibe(v)
    localStorage.setItem('mgVibe', v)
    setFlow('resumeNew')
  }

  function handleResumeNew(choice) {
    if (choice === 'resume') {
      // you can wire your actual resume here; for now go checklist → chat
      setFlow('checklist')
    } else {
      setFlow('questionnaire')
    }
  }

  function handleQuestionnaireDone() {
    setFlow('checklist')
  }

  function handleChecklistDone() {
    setFlow('chat')
  }

  return (
    <div className="page-wrap">
      <LogoHeader />
      {flow === 'vibe' && <VibeSelect firstName={firstName} onSelect={handleVibeSelect} />}
      {flow === 'resumeNew' && <ResumeOrNew onPick={handleResumeNew} />}
      {flow === 'questionnaire' && (
        <div style={{padding:'18px'}}>
          {/* Use your existing Questionnaire. It should call handleQuestionnaireDone() when finished */}
          <div style={{maxWidth:980, margin:'0 auto', border:'1px solid #e5e7eb', borderRadius:16, background:'#fff', boxShadow:'0 10px 30px rgba(0,0,0,.06)'}}>
            <Questionnaire onDone={handleQuestionnaireDone} />
          </div>
        </div>
      )}
      {flow === 'checklist' && <Checklist onDone={handleChecklistDone} />}
      {flow === 'chat' && <ChatConsole firstName={firstName} />}

      <style jsx global>{`
        html, body, #__next { background:#ffffff; }
        * { box-sizing: border-box; }
        .page-wrap { min-height:100vh; background:#fff; }
        a { color:#111; text-decoration: underline; text-underline-offset: 2px; }
        ::selection { background: #fde68a; }
      `}</style>
    </div>
  )
}
