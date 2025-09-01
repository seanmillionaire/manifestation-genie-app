// /pages/onboard.js — match Vibe styling + clearer copy + no "Friend" freeze
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { get, set } from '../src/flowState';

export default function Onboard(){
  const router = useRouter();
  const [S, setS] = useState(get());

  // hydrate state snapshot on mount (in case another tab updated store)
  useEffect(() => { setS(get()); }, []);

  // resolve name at render (don’t freeze)
  function firstName() {
    const n = (S.firstName || '').trim();
    if (n && n !== 'Friend') return n;
    if (typeof window !== 'undefined') {
      const ls = (localStorage.getItem('mg_first_name') || '').trim();
      if (ls) return ls;
    }
    return 'Friend';
  }

  const last = S.lastWish || S.currentWish;

  function resume() {
    if (last) {
      set({ currentWish: last });
      if ((S.steps || []).length) router.push('/checklist');
      else router.push('/flow');
    } else {
      router.push('/flow');
    }
  }

  function fresh() {
    set({ currentWish: null, steps: [] });
    router.push('/flow');
  }

  return (
    <main style={{ width: 'min(900px, 94vw)', margin: '30px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 12px' }}>
        Continue or start new?
      </h1>

      <p className="text-sm text-black/60 h-5" aria-live="polite">
        {`Pick up where you left off, ${firstName()} — or start a fresh wish.`}
      </p>

      <section
        style={{
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 12,
          padding: 12,
          background: '#fafafa',
        }}
      >
        {/* white card like Vibe */}
        <div
          style={{
            background: 'white',
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 12,
            padding: '14px 16px',
          }}
        >
          {/* action buttons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 12,
              marginBottom: last ? 12 : 0,
            }}
          >
            <button
              onClick={resume}
              style={{
                minHeight: 48,
                background: '#ffd600',
                border: 0,
                borderRadius: 12,
                padding: '14px 16px',
                fontWeight: 900,
                cursor: 'pointer',
              }}
              aria-label="Continue last wish"
            >
              Continue last wish
            </button>

            <button
              onClick={fresh}
              style={{
                minHeight: 48,
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: 12,
                padding: '14px 16px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
              aria-label="Start new wish"
            >
              Start new wish
            </button>
          </div>

          {/* last session summary */}
          {last && (
            <div
              style={{
                padding: 12,
                border: '1px dashed rgba(0,0,0,0.2)',
                borderRadius: 12,
                background: 'rgba(255,214,0,0.06)',
              }}
            >
              <div style={{ marginBottom: 6 }}>
                <b>Last wish:</b> {last.wish || '—'}
              </div>
              <div style={{ marginBottom: 6 }}>
                <b>Vibe:</b> {last.vibe || S?.vibe?.name || S?.vibe || '—'}
              </div>
              <div>
                <b>Last step:</b> {last.micro || '—'}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
