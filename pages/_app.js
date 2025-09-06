// /pages/_app.js
import '../styles/globals.css'
import '../styles/light-theme.css'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { setFirstName } from '../src/flowState'
import { loadAllIntoFlowState } from '../src/persist'
import { hydrateFirstNameFromSupabase } from '../src/userName'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'

const LOGO_SRC = 'https://storage.googleapis.com/mixo-sites/images/file-a7eebac5-6af9-4253-bc71-34c0d455a852.png'

// Protected app links (only when authed)
const navLinks = [
  { href: '/home',    label: 'Home'   },
  { href: '/vibe',    label: 'Start'  }, // "Start" = Flow page
  { href: '/profile', label: 'Profile' }
];

function NavLink({ href, label, isActive, count }) {
  return (
    <Link href={href} legacyBehavior>
      <a
        aria-current={isActive ? "page" : undefined}
        style={{
          position: "relative",
          padding: "10px 14px",
          lineHeight: "24px",
          borderRadius: 10,
          fontWeight: isActive ? 800 : 600,
          textDecoration: "none",
          border: isActive ? `1px solid var(--brand)` : "1px solid transparent",
          background: isActive ? "var(--soft)" : "transparent",
          color: "var(--text)",
          whiteSpace: "nowrap",
          outlineOffset: 2,
        }}
      >
        {label}
        {count !== undefined && count > 0 && (
          <span className="mg-badge" aria-label={`${count} new notifications`}>
            <span className="mg-badge-ping" aria-hidden="true" />
            {count > 99 ? "99+" : count}
          </span>
        )}
      </a>
    </Link>
  );
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
  navLinks.map((l) => (
    <NavLink
      key={l.href}
      href={l.href}
      label={l.label}
      isActive={
        currentPath === l.href ||
        (l.href !== "/" && currentPath.startsWith(l.href))
      }
      count={l.label === "Start" ? 3 : undefined}
    />
  ))
) : (
  <>
    <Link href="/login" legacyBehavior>
      <a
        style={{
          padding: "10px 16px",
          lineHeight: "24px",
          borderRadius: 10,
          fontWeight: 700,
          background: "var(--purple)",
          color: "#fff",
          whiteSpace: "nowrap",
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

  // Auth state for header
  const [isAuthed, setIsAuthed] = useState(false)

  // Your browser client (kept local to this file)
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])

  // Load saved data into flow state (kept from your design)
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

  // Determine logged-in/out for header + auto log today's visit
  useEffect(() => {
    let mounted = true;

    // 1) run once
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session = data?.session;
      setIsAuthed(!!session);
      if (session?.user?.id) upsertToday(supabase, session.user.id);
    });

    // 2) react to future changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthed(!!session);
      if (session?.user?.id) upsertToday(supabase, session.user.id);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [supabase]);

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
          
          /* --- Start badge animation --- */
@keyframes mg-pulse {
  0% { transform: scale(1); opacity: .7; }
  70% { transform: scale(1.1); opacity: 0; }
  100% { transform: scale(2); opacity: 0; }
}
.mg-badge {
  position: absolute; top: -6px; right: -10px;
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; padding: 0 6px;
  border-radius: 9999px; background: var(--green); color: #fff;
  font-size: 12px; font-weight: 700; line-height: 1;
  box-shadow: 0 0 0 2px #fff; /* keeps it crisp on white headers */
}
.mg-badge-ping {
  position: absolute; inset: 0; border-radius: 9999px;
  background: var(--green); opacity: .35;
  animation: mg-pulse 1.4s cubic-bezier(.3,0,.7,1) infinite;
}
@media (prefers-reduced-motion: reduce) {
  .mg-badge-ping { animation: none; display: none; }
}
/* --- End badge animation --- */

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
        <LogoHeader currentPath={router.pathname} isAuthed={isAuthed} />
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

// ---- helpers ----
async function upsertToday(supabase, userId) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  await supabase
    .from("user_daily_visits")
    .upsert(
      { user_id: userId, visit_date: today },
      { onConflict: "user_id,visit_date", ignoreDuplicates: true }
    );
}
