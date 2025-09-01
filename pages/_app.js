// /pages/_app.js — minimal shell + sticky Buy button on every page
import '../styles/globals.css'
import '../styles/light-theme.css'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

// Load flow state + first name early so pages can use them
import { loadAllIntoFlowState } from '../src/persist'
import { hydrateFirstNameFromSupabase } from '../src/userName'

const PAY_URL = process.env.NEXT_PUBLIC_PAY_URL || process.env.NEXT_PUBLIC_PAYHIP_URL || 'https://hypnoticmeditations.ai'

function StickyPayBar(){
  if (!PAY_URL) return null
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
    // hydrate local flow + first name
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
  <img
    src="https://storage.googleapis.com/mixo-sites/images/file-a7eebac5-6af9-4253-bc71-34c0d455a852.png"
    alt="Genie"
    style={{
      height: 48,       // bigger, looks balanced with text
      width: 'auto',    // keeps proportions
      borderRadius: 8   // optional, adjust if you want square
    }}
  />

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
