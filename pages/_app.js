// /pages/_app.js — minimal shell + sticky Buy button (hard‑coded link)
import '../styles/globals.css'
import '../styles/light-theme.css'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

import { loadAllIntoFlowState } from '../src/persist'
import { hydrateFirstNameFromSupabase } from '../src/userName'

// 👇 Your live order page (with UTM tags for attribution)
const PAY_URL = 'https://hypnoticmeditations.ai/order?link=SiQ1E&utm_source=genie&utm_medium=app&utm_campaign=v1_launch'

function StickyPayBar(){
  return (
    <div
      style={{
        position:'fixed', left:'50%', transform:'translateX(-50%)',
        bottom:12, width:'min(900px, 94vw)', zIndex:60,
        display:'flex', justifyContent:'space-between', alignItems:'center',
        gap:12, background:'#0f172a', color:'#fff', padding:'10px 12px',
        border:'1px solid rgba(255,255,255,0.12)', borderRadius:14,
        boxShadow:'0 20px 50px rgba(0,0,0,0.35)'
      }}
      role="region"
      aria-label="Buy bar"
    >
      <div style={{fontWeight:800, fontSize:14}}>7‑Minute Reset ready</div>
      <a
        href={PAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{background:'#ffd600', color:'#000', fontWeight:900, borderRadius:12, padding:'10px 14px', textDecoration:'none'}}
      >
        Get the Reset
      </a>
    </div>
  )
}

export default function App({ Component, pageProps }){
  const router = useRouter()

  useEffect(() => {
    try { loadAllIntoFlowState() } catch {}
    try { hydrateFirstNameFromSupabase() } catch {}
  }, [])

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Manifestation Genie</title>
      </Head>

      <div style={{minHeight:'100vh', display:'flex', flexDirection:'column'}}>
        <header style={{borderBottom:'1px solid rgba(0,0,0,0.08)', background:'#fff'}}>
          <div style={{maxWidth:980, margin:'0 auto', padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <Link href="/home" style={{display:'inline-flex', alignItems:'center', gap:10, textDecoration:'none'}}>
              <img src="https://storage.googleapis.com/mixo-sites/images/file-a7eebac5-6af9-4253-bc71-34c0d455a852.png" alt="Genie" width="34" height="34" style={{borderRadius:6}} />
              <strong style={{color:'#0f172a'}}>Manifestation Genie</strong>
            </Link>
            <nav style={{display:'flex', gap:14}}>
              <Link href="/home">Home</Link>
              <Link href="/vibe">Flow</Link>
              <Link href="/chat">Chat</Link>
            </nav>
          </div>
        </header>

        <main style={{flex:1}}>
          <Component {...pageProps} />
        </main>

        <footer style={{borderTop:'1px solid rgba(0,0,0,0.08)', background:'#fff'}}>
          <div style={{maxWidth:980, margin:'0 auto', padding:'14px', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, color:'#334155'}}>
            <span>© {new Date().getFullYear()} Manifestation Genie</span>
            <span style={{display:'flex', gap:12}}>
              <a href="/legal" style={{textDecoration:'none'}}>Legal</a>
              <a href="https://hypnoticmeditations.ai" target="_blank" rel="noopener noreferrer" style={{textDecoration:'none'}}>HypnoticMeditations.ai</a>
            </span>
          </div>
        </footer>

        <StickyPayBar />
      </div>
    </>
  )
}
