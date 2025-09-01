// /pages/vibe.js — match Home styling + no "Friend" freeze
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { get, set } from '../src/flowState';

async function hydrateName() {
  try {
    const m = await import('../src/userName');
    if (m && typeof m.hydrateFirstNameFromSupabase === 'function') {
      await m.hydrateFirstNameFromSupabase();
    }
  } catch {}
}

export default function Vibe() {
  const router = useRouter();
  const [S, setS] = useState(get());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Hydrate like Home: server first, then localStorage; never freeze the name
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await hydrateName(); // try server/profile hydration first

        if (typeof window !== 'undefined') {
          const lsName = (localStorage.getItem('mg_first_name') || '').trim();
          if (lsName && (!get().firstName || get().firstName === 'Friend')) {
            set({ firstName: lsName });
          }
        }
        if (alive) setS(get());
      } catch {
        if (alive) setErr('Could not load your profile. Showing default view.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Resolve first name at render (don’t store it in local state)
  const resolveFirstName = () => {
    const stateName = (S.firstName || '').trim();
    if (stateName && stateName !== 'Friend') return stateName;
    if (typeof window !== 'undefined') {
      const ls = (localStorage.getItem('mg_first_name') || '').trim();
      if (ls) return ls;
    }
    return 'Friend';
  };
  const firstName = resolveFirstName();

  // Choose a vibe; keep your existing nav to /onboard
  const pick = (v) => {
    set({ vibe: { id: v, name: v }, phase: 'resumeNew' });
    router.push('/onboard');
  };

  return (
    <main style={{ width: 'min(900px, 94vw)', margin: '30px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 12px' }}>
        Pick your vibe
      </h1>

      <p className="text-sm text-black/60 h-5" aria-live="polite">
        {loading ? 'Loading your profile…' : err ? err : `What are we feeling today, ${firstName}?`}
      </p>

      <section
        style={{
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 12,
          padding: 12,
          background: '#fafafa',
        }}
      >
        {/* card — vibe choices */}
        <div
          style={{
            background: 'white',
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 12,
            padding: '14px 16px',
          }}
        >
          <div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
  }}
>
  <button
    onClick={() => pick('BOLD')}
    style={{
      minHeight: 48,
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.12)',
      borderRadius: 12,
      padding: '14px 16px',
      fontWeight: 800,
      cursor: 'pointer',
    }}
    aria-label="Pick Bold vibe"
  >
    🔥 BOLD
  </button>

  <button
    onClick={() => pick('CALM')}
    style={{
      minHeight: 48,
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.12)',
      borderRadius: 12,
      padding: '14px 16px',
      fontWeight: 800,
      cursor: 'pointer',
    }}
    aria-label="Pick Calm vibe"
  >
    🙏 CALM
  </button>

  <button
    onClick={() => pick('RICH')}
    style={{
      minHeight: 48,
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.12)',
      borderRadius: 12,
      padding: '14px 16px',
      fontWeight: 800,
      cursor: 'pointer',
    }}
    aria-label="Pick Rich vibe"
  >
    💰 RICH
  </button>

  <button
    onClick={() => pick('LOVING')}
    style={{
      minHeight: 48,
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.12)',
      borderRadius: 12,
      padding: '14px 16px',
      fontWeight: 800,
      cursor: 'pointer',
    }}
    aria-label="Pick Loving vibe"
  >
    🌸 LOVING
  </button>

  <button
    onClick={() => pick('FOCUSED')}
    style={{
      minHeight: 48,
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.12)',
      borderRadius: 12,
      padding: '14px 16px',
      fontWeight: 800,
      cursor: 'pointer',
    }}
    aria-label="Pick Focused vibe"
  >
    🎯 FOCUSED
  </button>

  <button
    onClick={() => pick('FREE')}
    style={{
      minHeight: 48,
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.12)',
      borderRadius: 12,
      padding: '14px 16px',
      fontWeight: 800,
      cursor: 'pointer',
    }}
    aria-label="Pick Free vibe"
  >
    🌍 FREE
  </button>
</div>

        </div>
      </section>
    </main>
  );
}
