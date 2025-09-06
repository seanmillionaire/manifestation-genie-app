// /pages/flow.js — Manifestor style with personalized name
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { get, set } from '../src/flowState';
import { generateChecklist } from '../src/checklistGen';
import { supabase } from "../src/supabaseClient";

export default function Flow() {
  const router = useRouter();
  const S = get();
  const init = S.currentWish || { wish: '', block: '', micro: '' };

  const [wish, setWish]   = useState(init.wish || '');
  const [block, setBlock] = useState(init.block || '');
  const [micro, setMicro] = useState(init.micro || '');
  const [firstName, setFirstName] = useState('Friend');

  useEffect(() => {
    const snap = get();
    let n = (snap.firstName || '').trim();
    if (!n || n === 'Friend') {
      try {
        const ls = (localStorage.getItem('mg_first_name') || '').trim();
        if (ls) n = ls;
      } catch {}
    }
    if (!n) n = 'Friend';
    setFirstName(n);
  }, []);

  // ✅ strict boolean; avoids autofill/hydration oddities
  const can = wish.trim().length > 0 && micro.trim().length > 0;

  // (Optional but helpful) sync browser-restored values after back/refresh
  useEffect(() => {
    const w = document.querySelector('textarea[placeholder*="State it simply"]')?.value || '';
    const m = document.querySelector('input[placeholder*="Send it"]')?.value || '';
    if (w && !wish) setWish(w);
    if (m && !micro) setMicro(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  async function lock() {
    if (!can) return; // extra safety

    const current = {
      wish: wish.trim(),
      block: block.trim(),
      micro: micro.trim(),
      vibe: S.vibe,
      date: new Date().toISOString().slice(0, 10),
    };
    const steps = generateChecklist(current);
    set({ currentWish: current, lastWish: current, steps, phase: 'checklist' });

    // 🆕 save wish to Supabase for Profile
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (uid) {
        await supabase.from("wishes").insert({
          user_id: uid,
          title: current.wish,
          note: current.block || null
        });
      }
    } catch (err) {
      console.error("Error saving wish:", err.message);
    }

    router.push('/checklist');
  }

  return (
    <main style={{ width: 'min(900px, 94vw)', margin: '30px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 12px' }}>
        Your manifestation roadmap for today
      </h1>

      <p className="text-sm text-black/60 h-5" aria-live="polite">
        {`${firstName}, let’s set your intention, clear the block, and lock in the inspired action that moves your dream closer.`}
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
            What do you want to manifest? (please tell me all of the details)
          </label>
          <textarea
            rows={3}
            style={input}
            value={wish}
            onChange={e => setWish(e.target.value)}
            placeholder="State it simply. One line of power."
          />

          <label style={{ margin: '12px 0 6px', display: 'block', fontWeight: 600 }}>
            What's your biggest challenge?
          </label>
          <textarea
            rows={2}
            style={input}
            value={block}
            onChange={e => setBlock(e.target.value)}
            placeholder="What's blocking you? Honest + clear."
          />

          <label style={{ margin: '12px 0 6px', display: 'block', fontWeight: 600 }}>
            What small step can you take right now?
          </label>
          <input
            style={input}
            value={micro}
            onChange={e => setMicro(e.target.value)}
            placeholder="Send it. Start it. Claim it."
          />

          <button
            type="button"               // ✅ prevents implicit submit/reload
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
            ✨ Begin the magic →
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
