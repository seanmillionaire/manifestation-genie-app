// /pages/_app.js
import '../styles/globals.css'
import '../styles/light-theme.css'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { setFirstName } from '../src/flowState'

// If you DID set up the "@" alias, keep this line.
// If not, change to:  import { loadAllIntoFlowState } from '../src/persist'
import { loadAllIntoFlowState } from '../src/persist'
import { hydrateFirstNameFromSupabase } from '../src/userName'

// ✅ Use your existing Supabase client
import { supabase } from '../src/supabaseClient'

const LOGO_SRC = 'https://storage.googleapis.com/mixo-sites/images/file-a7eebac5-6af9-4253-bc71-34c0d455a852.png'

// Protected app links (only when authed)
const navLinks = [
  { href: '/home',    label: 'Home'   },
  { href: '/vibe',    label: 'Start'  }, // "Start" = Flow page
  { href: '/profile', label: 'Profile' }
];

function NavLink({ href, label, isActive }) {
  return (
    <Link href={href} legacyBehavior>
      <a
        aria-current={isActive ? 'page' : undefined}
        style={{
          padding: '10px 14px',
          lineHeight: '24px',
          borderRadius: 10,
          fontWeight: isActive ? 800 : 600,
          textDecoration: 'none',
          border: isActive ? `1px solid var(--brand)` : '1px solid transparent',
          background: isActive ? 'var(--soft)' : 'transparent',
          color: 'var(--text)',
          whiteSpace: 'nowrap',
          outlineOffset: 2
        }}
      >
        {label}
      </a>
    </Link>
  )
}

function LogoHeader({ currentPath, isAuthed }) {
  return (
    <div style={{
      width:'100%',
      borderBottom:'1px solid var(--border)',
      background:'#fff',
      position:'sticky', top:0, zIndex:50
    }}>
      <div style={{
        width:'min(1100px, 94vw)',
        margin:'0 auto',
        display:'flex',
        alignItems:'center',
        gap:14,
        padding:'10px 12px'
      }}>
        <img src={LOGO_SRC} alt="Manifestation Genie" style={{height:36, width:'auto'}} />

        <nav
          aria-label="Primary"
          style={{
            marginLeft:'auto',
            display:'flex',
            alignItems:'center',
            gap:8,
            overflowX:'auto',
            padding:'4px 0'
          }}
        >
          {isAuthed ? (
            navLinks.map(l => (
              <NavLink
                key={l.href}
                href={l.href}
                label={l.label}
                isActive={
                  currentPath === l.href ||
                  (l.href !== '/' && currentPath.startsWith(l.href))
                }
              />
            ))
          ) : (
            <>
              <Link href="/demo" legacyBehavior>
                <a
                  style={{
                    padding:'10px 14px',
                    lineHeight:'24px',
                    borderRadius:10,
                    fontWeight:700,
                    border:'1px solid var(--border)',
                    background:'var(--soft)',
                    color:'var(--text)',
                    whiteSpace:'nowrap'
                  }}
                  aria-label="Try the free demo"
                >
                  Try Demo
                </a>
              </Link>
              <Link href="/login" legacyBehavior>
                <a
                  style={{
                    padding:'10px 16px',
                    lineHeight:'24px',
                    borderRadius:10,
                    fontWeight:700,
                    background:'var(--purple)',
                    color:'#fff',
                    whiteSpace:'nowrap'
                  }}
                  aria-label="Log in"
                >
                  Log In
                </a>
              </Link>
            </>
          )}
        </nav>
      </div>
    </div>
  )
}

export default function App({ Component, pageProps }) {
  const router = useRouter()

  // ❗️Start as "unknown" so we avoid flashing the wrong menu
  const [isAuthed, setIsAuthed] = useState(null)

  // Pull saved data (your original logic)
  useEffect(() => {
    loadAllIntoFlowState().then(() => {
      try {
        const cached = localStorage.getItem('mg_first_name');
        if (cached && cached.trim() && cached !== 'Friend') {
          setFirstName(cached);
        } else {
          hydrateFirstNameFromSupabase?.();
        }
      } catch {
        hydrateFirstNameFromSupabase?.();
      }
    });
  }, []);

  // ✅ Determine logged-in/out for header using your client
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthed(!!data?.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthed(!!session);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root{
            --bg:#ffffff; --card:#ffffff; --soft:#f8fafc; --text:#111111; --muted:#334155;
            --brand:#6633CC; --gold:#FFD600; --green:#16a34a; --purple:#6633CC; --border:#e5e7eb;
          }
          html,body{ margin:0; padding:0; background:var(--bg); color:var(--text);
            font-family:Poppins,system-ui,Arial; min-height:100%; }
          *{ box-sizing:border-box }
          .pageWrap{ display:flex; flex-direction:column; min-height:100vh; }
          main{ flex:1; }
          a:focus-visible{ outline: 3px solid var(--brand); outline-offset:2px; border-radius:10px; }
          footer{ text-align:center; padding:20px 12px; font-size:14px; color:var(--muted);
            border-top:1px solid var(--border); line-height:1.6; background:#fff; }
          footer a{ color:#0b67ff; text-decoration:none; font-weight:600; }
          footer a:hover{ text-decoration:underline; }
        `}</style>
      </Head>
      <div className="pageWrap">
        {/* While auth is unknown, hide the nav to avoid a confusing flash */}
        {isAuthed === null ? null : (
          <LogoHeader currentPath={router.pathname} isAuthed={isAuthed} />
        )}
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
      </div>
    </>
  )
}
