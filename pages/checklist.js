// /pages/checklist.js — Primer screen (no checkboxes, no waiting)
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { get, set } from '../src/flowState';

export default function ChecklistPage() {
  const router = useRouter();
  const [S, setS] = useState(get());

  useEffect(() => { setS(get()); }, []);

  // Resolve name at render (don't freeze)
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
  const microText = S.currentWish?.micro || 'your smallest next step';

  function goChat() {
    set({ phase: 'chat' });
    router.push('/chat');
  }

  function editPlan() {
    router.push('/flow');
  }

  return (
    <main style={{ width: 'min(900px, 94vw)', margin: '30px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 12px' }}>
        Ready to activate
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
          {/* Simple primer — no interactions */}
          <div style={{
            padding: 12,
            borderRadius: 12,
            background: 'rgba(0,0,0,0.03)',
            border: '1px solid rgba(0,0,0,0.08)',
            marginBottom: 12
          }}>
            <p style={{ margin: 0 }}><b>Focus:</b> turn on DND, one tab only (2 min).</p>
            <p style={{ margin: '8px 0 0' }}><b>Aligned move:</b> {microText} (15 min timer).</p>
            <p style={{ margin: '8px 0 0' }}><b>Momentum:</b> share one message or tell one person today.</p>
          </div>

          {/* Primary actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
            <button
              onClick={goChat}
              style={{
                padding: '12px 16px',
                borderRadius: 14,
                border: 0,
                background: '#ffd600',
                fontWeight: 900,
                cursor: 'pointer'
              }}
            >
              ✨ I’m ready → Enter chat
            </button>

            <button
              onClick={editPlan}
              style={{
                padding: '12px 16px',
                borderRadius: 14,
                border: '1px solid rgba(0,0,0,0.2)',
                background: 'transparent',
                fontWeight: 820,
                cursor: 'pointer'
              }}
            >
              Edit plan
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
