// /pages/_app.js — clean header + 3-button nav + sticky Buy bar
import '../styles/globals.css'
import '../styles/light-theme.css'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

// (optional) if you use these, keep them; safe if missing
try { require('../src/persist').loadAllIntoFlowState?.() } catch {}
try { require('../src/userName').hydrateFirstNameFromSupabase?.() } catch {}

// Your live order page (with UTM)
const PAY_URL =
  'https://hypnoticmeditations.ai/order?link=SiQ1E&utm_source=genie&utm_medium=app&utm_campaign=v1_launch'

const LOGO_SRC =
  'https://storage.googleapis.com/mixo-sites/images/file-a7eebac5-6af9-4253-bc71-34c0d455a852.png'

// --- UI bits ---
function NavButton({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      style={{
        padding: '8px 14px',
        borderRadius: 999,
        border: active ? '1px solid #6633CC' : '1px solid rgba(0,0,0,0.10)',
        background: active ? 'rgba(102,51,204,0.08)' : '#fff',
        color: '#111',
        fontWeight: 700,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Link>
  )
}

function Header() {
  const router = useRouter()
  const path = router.pathname
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <div
        style={{
          width: 'min(1100px,94vw)',
          margin: '0 auto',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <Link href="/home" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <img src={LOGO_SRC} alt="Manifestation Genie" height={36} />
        </Link>

        <nav
          aria-label="Primary"
          style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}
        >
          <NavButton href="/home" label="Home" active={path.startsWith('/home')} />
          {/* “Start” begins at the vibe step; switch to '/flow' if you prefer */}
          <NavButton href="/vibe" label="Start" active={path.startsWith('/vibe')} />
          <NavButton href="/profile" label="Profile" active={path.startsWith('/profile')} />
        </nav>
      </div>
    </header>
  )
}

function StickyPayBar() {
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 12,
        width: 'min(900px,94vw)',
        zIndex: 60,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        background: '#0f172a',
        color: '#fff',
        padding: '10px 12px',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14,
        boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
      }}
      role="region"
      aria-label="Buy bar"
    >
      <div style={{ fontWeight: 800, fontSize: 14 }}>7-Minute Reset ready</div>
      <a
        href={PAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: '#ffd600',
          color: '#000',
          fontWeight: 900,
          borderRadius: 12,
          padding: '10px 14px',
          textDecoration: 'none',
        }}
      >
        Get the Reset
      </a>
    </div>
  )
}

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Manifestation Genie</title>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root{ --border:#e5e7eb; }
          html,body{ margin:0; padding:0; background:#fff; color:#111; font-family:Poppins,system-ui,Arial; }
          *{ box-sizing:border-box }
          .pageWrap{ min-height:100vh; display:flex; flex-direction:column; }
          main{ flex:1; }
          footer{ border-top:1px solid var(--border); background:#fff; color:#334155; font-size:14px; text-align:center; padding:18px 12px; }
          footer a{ color:#0b67ff; text-decoration:none; font-weight:600; }
          footer a:hover{ text-decoration:underline; }
        `}</style>
      </Head>

      <div className="pageWrap">
        <Header />
        <main>
          <Component {...pageProps} />
        </main>
        <footer>
          <div>© {new Date().getFullYear()} Manifestation Genie. All rights reserved.</div>
          <div>
            Powered by{' '}
            <a href="https://hypnoticmeditations.ai" target="_blank" rel="noopener noreferrer">
              HypnoticMeditations.ai
            </a>
          </div>
        </footer>

        <StickyPayBar />
      </div>
    </>
  )
}
