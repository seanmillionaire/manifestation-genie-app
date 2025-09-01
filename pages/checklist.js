// /pages/checklist.js — Manifestor primer (concise) — no Edit Plan button
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { get, set } from '../src/flowState';

export default function ChecklistPage() {
  const router = useRouter();
  const [S, setS] = useState(get());

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

  const wishText  = S.currentWish?.wish  || 'your intention';
  const microText = S.currentWish?.micro || 'your next tiny step';

  function goChat() {
    set({ phase: 'chat' });
    router.push('/chat');
  }

  return (
    <main style={{ width: 'min(900px, 94vw)', margin: '30px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 12px' }}>
        Take a second to get yourself ready for this magical journey!
      </h1>

      <p className="text-sm text-black/60 h-5" aria-live="polite">
        {firstName()}, take a breath. You’re set to bring <b>{wishText}</b> into form today.
      </p>

      <section
        style={{
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 12,
          padding: 12,
          background: '#fafafa'
        }}
      >
        <div
          style={{
            background: 'white',
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 12,
            padding: '14px 16px'
          }}
        >
          {/* ultra-clear, manifestor-style primer */}
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: 'rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.08)',
              marginBottom: 12
            }}
          >
            <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>
                <b>Prepare.</b> Turn on Do Not Disturb, close other tabs, clear your space.
              </li>
              <li style={{ marginTop: 8 }}>
                <b>Focus.</b> Start a 15-minute timer and do: “{microText}”.
              </li>
              <li style={{ marginTop: 8 }}>
                <b>Manifest.</b> Say or post one sentence about “{wishText}” to one person/platform.
              </li>
            </ol>
          </div>

          {/* single primary CTA */}
          <button
            onClick={goChat}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 14,
              border: 0,
              background: '#ffd600',
              fontWeight: 900,
              cursor: 'pointer'
            }}
          >
            ✨ I’m ready → NEXT STEP
          </button>
        </div>
      </section>
    </main>
  );
}
