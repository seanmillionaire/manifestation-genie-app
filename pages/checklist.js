// /pages/checklist.js — manifestor style
import { useRouter } from 'next/router';
import { get, set } from '../src/flowState';

export default function ChecklistPage() {
  const router = useRouter();
  const S = get();
  const steps = S.steps || [];
  const allDone = steps.length > 0 && steps.every(s => s.done);

  const toggle = (id) => {
    const next = steps.map((s) => (s.id === id ? { ...s, done: !s.done } : s));
    set({ steps: next });
  };

  const enterChat = () => {
    set({ phase: 'chat' });
    router.push('/chat');
  };
  const skip = () => {
    set({ phase: 'chat' });
    router.push('/chat');
  };

  const wishText = S.currentWish?.wish || 'your intention';

  return (
    <main style={{ width: 'min(900px, 94vw)', margin: '30px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 12px' }}>
        Activate it now
      </h1>

      <p className="text-sm text-black/60 h-5" aria-live="polite">
        Here are your aligned actions to bring <b>{wishText}</b> into form today.
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
          <ul style={{ listStyle: 'none', paddingLeft: 0, margin: '0 0 12px' }}>
            {steps.map((s, i) => (
              <li
                key={s.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.03)',
                  marginBottom: 8,
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!s.done}
                    onChange={() => toggle(s.id)}
                    style={{ width: 18, height: 18, accentColor: '#ffd600' }}
                    aria-label={`Mark step ${i + 1} as ${
                      s.done ? 'not done' : 'done'
                    }`}
                  />
                  <span>{i + 1}. {s.text}</span>
                </label>
              </li>
            ))}
            {steps.length === 0 && (
              <li style={{ padding: '8px 0', color: 'rgba(0,0,0,0.6)' }}>
                No aligned actions yet — head back to Flow and set today’s plan.
              </li>
            )}
          </ul>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
            <button
              onClick={enterChat}
              disabled={!allDone}
              style={{
                padding: '12px 16px',
                borderRadius: 14,
                border: 0,
                background: allDone ? '#ffd600' : '#ffe680',
                fontWeight: 900,
                cursor: allDone ? 'pointer' : 'not-allowed',
              }}
            >
              ✅ I’ve activated it → Enter chat
            </button>

            <button
              onClick={skip}
              style={{
                padding: '12px 16px',
                borderRadius: 14,
                border: '1px solid rgba(0,0,0,0.2)',
                background: 'transparent',
                fontWeight: 820,
              }}
            >
              ⏭ Not now, I’ll return later
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
