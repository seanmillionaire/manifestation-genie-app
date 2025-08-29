// pages/_app.js — Global shell (header uses fixed logo image + widgets + pledge gate)

import '../styles/globals.css'
import '../styles/light-theme.css'
import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

// ---------- Header with fixed logo ----------
function Header() {
  return (
    <header style={{position:'sticky', top:0, zIndex:50, background:'#fff', borderBottom:'1px solid #e5e7eb'}}>
      <div style={{maxWidth:980, margin:'0 auto', padding:'10px 16px', display:'flex', alignItems:'center', gap:12}}>
        <img
          src="https://storage.googleapis.com/mixo-sites/images/file-a7eebac5-6af9-4253-bc71-34c0d455a852.png"
          alt="Manifestation Genie"
          style={{height:34, width:'auto', objectFit:'contain'}}
        />
        <nav style={{marginLeft:'auto', display:'flex', gap:14}}>
          <Link href="/flow" className="link">Flow</Link>
          <Link href="/chat" className="link">Chat</Link>
          <Link href="/onboard" className="link">Onboard</Link>
        </nav>
      </div>
    </header>
  )
}

// ---------- Emergency Reset ----------
function EmergencyReset() {
  if (typeof window === 'undefined') return null
  const AUDIO_SRC = '/audio/emergency-reset.mp3'
  const [open, setOpen] = React.useState(false)
  const [playing, setPlaying] = React.useState(false)
  const [note, setNote] = React.useState('Panic easing • Money stress calming')
  const [audio, setAudio] = React.useState(null)

  React.useEffect(() => {
    const a = new Audio(AUDIO_SRC)
    a.preload = 'auto'
    a.addEventListener('ended', () => setPlaying(false))
    setAudio(a)
    return () => { try { a.pause(); a.src=''; } catch(e){} }
  }, [])

  function todayKey(){ return `mg_relief_${new Date().toISOString().slice(0,10)}` }
  function load(){ try { return JSON.parse(localStorage.getItem(todayKey())||'[]') } catch { return [] } }
  function log(){
    const arr = load(); arr.push({ type:'emergency_reset', note, ts: Date.now() })
    localStorage.setItem(todayKey(), JSON.stringify(arr))
  }

  function togglePlay(){
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.currentTime = 0; audio.play().catch(()=>{}); setPlaying(true); log() }
  }

  return (
    <div style={{position:'fixed', right:16, bottom:16, zIndex:60, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:10}}>
      {open && (
        <div style={{width:300, padding:14, border:'1px solid #e5e7eb', borderRadius:12, boxShadow:'0 16px 50px rgba(15,23,42,.18)', background:'#fff'}}>
          <div style={{fontWeight:800, marginBottom:6}}>Emergency Reset</div>
          <p style={{margin:'0 0 8px', color:'#475569', fontSize:14}}>
            3–7 minute calming track for money panic, fight/flight, and “card declined” spirals.
          </p>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional note"
                 style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:10, marginBottom:10}} />
          <button className="btn btn-primary full" onClick={togglePlay}>{playing ? 'Pause' : 'Play Reset'}</button>
        </div>
      )}
      <button onClick={()=>setOpen(v=>!v)} className="btn btn-primary" style={{borderRadius:999, padding:'10px 14px'}}>
        {open ? 'Close Reset' : 'Emergency Reset'}
      </button>
    </div>
  )
}

// ---------- Results Tracker ----------
function ResultsTracker() {
  if (typeof window === 'undefined') return null
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState([])

  function todayKey(){ return `mg_relief_${new Date().toISOString().slice(0,10)}` }
  function load(){ try { return JSON.parse(localStorage.getItem(todayKey())||'[]') } catch { return [] } }

  React.useEffect(() => { if (open) setItems(load()) }, [open])

  return (
    <div style={{position:'fixed', left:16, bottom:16, zIndex:60}}>
      {open && (
        <div style={{width:300, padding:14, border:'1px solid #e5e7eb', borderRadius:12, boxShadow:'0 16px 50px rgba(15,23,42,.18)', background:'#fff', marginBottom:10}}>
          <div style={{fontWeight:800, marginBottom:6}}>Today’s Micro-Wins</div>
          {items.length===0 ? (
            <p style={{margin:0, color:'#475569'}}>No events yet. Press play on the Emergency Reset to log your first win.</p>
          ) : (
            <ul style={{margin:0, paddingLeft:18}}>
              {items.map((it, i)=>(
                <li key={i} style={{marginBottom:6}}>
                  <b>{it.type.replace('_',' ')}</b>
                  <div style={{fontSize:12, color:'#64748b'}}>{new Date(it.ts).toLocaleTimeString()} — {it.note||'Calm achieved'}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <button onClick={()=>setOpen(v=>!v)} className="btn btn-ghost" style={{borderRadius:999}}>
        {open ? 'Close Wins' : 'Today’s Wins'}
      </button>
    </div>
  )
}

// ---------- App ----------
export default function App({ Component, pageProps }) {
  const router = useRouter()

  // Gate: redirect to /onboard if no pledge yet
  useEffect(() => {
    const accepted = typeof window!=='undefined' && localStorage.getItem('mg_pledge_ok')==='1'
    const onOnboard = router.pathname.startsWith('/onboard')
    if (!accepted && !onOnboard) router.replace('/onboard')
  }, [router.pathname])

  return (
    <>
      <Header />
      <Component {...pageProps} />
      <EmergencyReset />
      <ResultsTracker />
    </>
  )
}
