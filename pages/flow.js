// /pages/flow.js — match Home/Vibe/Onboard design + clearer copy
import { useState } from 'react';
import { useRouter } from 'next/router';
import { get, set } from '../src/flowState';
import { generateChecklist } from '../src/checklistGen';

export default function Flow() {
  const router = useRouter();
  const S = get();
  const init = S.currentWish || { wish: '', block: '', micro: '' };

  const [wish, setWish]   = useState(init.wish || '');
  const [block, setBlock] = useState(init.block || '');
  const [micro, setMicro] = useState(init.micro || '');

  const can = wish.trim() && micro.trim();

  function lock() {
    const current = {
      wish: wish.trim(),
      block: block.trim(),
      micro: micro.trim(),
      vibe: S.vibe,
      date: new Date().toISOString().slice(0, 10),
    };
    const steps = generateChecklist(current);
    set({ currentWish: current, lastWish: current, steps, phase: 'checklist' });
    router.push('/checklist');
  }

  return (
    <main style={{ width: 'min(900px, 94vw)', margin: '30px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 12px' }}>
        Your plan for today
      </h1>

      <p className="text-sm text-black/60 h-5" aria-live="polite">
        Let’s map your wish, your snag, and the one tiny step you’ll take today.
      </p>

      <section
        style={{
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 12,
          padding: 12,
          background: '#fafafa',
        }}
      >
        <div
          style={{
            background: 'white',
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 12,
            padding: '14px 16px',
          }}
        >
          <label style={{ margin: '12px 0 6px', display: 'block', fontWeight: 600 }}>
            What’s the outcome you want?
          </label>
          <textarea
            rows={3}
            style={input}
            value={wish}
            onChange={e => setWish(e.target.value)}
            placeholder="One line. No fluff."
          />

          <label style={{ margin: '12px 0 6px', display: 'block', fontWeight: 600 }}>
            What’s blocking you?
          </label>
          <textarea
            rows={2}
            style={input}
            value={block}
            onChange={e => setBlock(e.target.value)}
            placeholder="Say the snag. Simple + true."
          />

          <label style={{ margin: '12px 0 6px', display: 'block', fontWeight: 600 }}>
            What’s 1 micro-move you can make today?
          </label>
          <input
            style={input}
            value={micro}
            onChange={e => setMicro(e.target.value)}
            placeholder="Send it. Start it. Ship it."
          />

          <button
            onClick={lock}
            disabled={!can}
            style={{
              marginTop: 14,
              padding: '12px 16px',
              borderRadius: 14,
              border: 0,
              background: can ? '#ffd600' : '#ffe680',
              fontWeight: 900,
              cursor: can ? 'pointer' : 'not-allowed',
              width: '100%',
            }}
          >
            Lock it in →
          </button>
        </div>
      </section>
    </main>
  );
}

const input = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.15)',
};
