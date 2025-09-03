// /pages/profile.js — Progress, Manifestation Board, Wins (client-only)
import { useEffect, useMemo, useState } from 'react';
+ import { get, set } from '../../src/flowState';

const LS_MANIFESTS = 'mg_manifestations';
const LS_WINS = 'mg_wins';
const LS_STREAK = 'mg_streak'; // {count, lastDay}

function loadJSON(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try { const v = JSON.parse(localStorage.getItem(key) || ''); return Array.isArray(fallback) && !Array.isArray(v) ? fallback : (v ?? fallback); } catch { return fallback; }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function todayKey() {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function ProfilePage() {
  const [S, setS] = useState(get());
  const [manifests, setManifests] = useState(loadJSON(LS_MANIFESTS, []));
  const [wins, setWins] = useState(loadJSON(LS_WINS, []));
  const [newWish, setNewWish] = useState('');
  const [newWin, setNewWin] = useState('');

  // ---- simple streak (based on app visits to profile or chat) ----
  useEffect(() => {
    const day = todayKey();
    const st = loadJSON(LS_STREAK, { count: 0, lastDay: '' });
    if (st.lastDay !== day) {
      // if consecutive day, increment; else reset to 1
      const dPrev = new Date(st.lastDay);
      const dNow = new Date(day);
      const diff = Math.round((dNow - dPrev) / (1000*60*60*24));
      const next = {
        count: st.lastDay && diff === 1 ? (st.count || 0) + 1 : 1,
        lastDay: day
      };
      saveJSON(LS_STREAK, next);
    }
  }, []);

  const streak = loadJSON(LS_STREAK, { count: 1, lastDay: todayKey() });

  // keep S live if changed elsewhere
  useEffect(() => {
    const id = setInterval(() => setS(get()), 1000);
    return () => clearInterval(id);
  }, []);

  // ---- derived progress ----
  const checks = useMemo(() => {
    return {
      acceptedEthics: !!S?.ethics?.acceptedAt,
      pickedVibe: !!S?.vibe?.id,
      setIntention: !!S?.prompt_spec?.prompt,
      capturedWish: !!S?.currentWish?.wish,
      chattedOnce: Array.isArray(S?.thread) && S.thread.length > 0,
    };
  }, [S]);

  const progress = useMemo(() => {
    const vals = Object.values(checks);
    const done = vals.filter(Boolean).length;
    const total = vals.length;
    return { done, total, pct: Math.round((done / total) * 100) };
  }, [checks]);

  // ---- actions ----
  function addManifest() {
    const t = newWish.trim(); if (!t) return;
    const item = { id: newId(), text: t, status: 'in-progress', createdAt: new Date().toISOString() };
    const next = [item, ...manifests];
    setManifests(next); saveJSON(LS_MANIFESTS, next);
    setNewWish('');
    // also reflect into flowState as currentWish (non-destructive)
    try {
      const cur = get() || {};
      set({ ...cur, currentWish: { ...(cur.currentWish||{}), wish: t, date: todayKey(), vibe: cur.vibe || null } });
      setS(get());
    } catch {}
  }
  function toggleManifestStatus(id) {
    const next = manifests.map(m => m.id === id
      ? { ...m, status: m.status === 'done' ? 'in-progress' : 'done', doneAt: m.status === 'done' ? null : new Date().toISOString() }
      : m);
    setManifests(next); saveJSON(LS_MANIFESTS, next);
  }
  function deleteManifest(id) {
    const next = manifests.filter(m => m.id !== id);
    setManifests(next); saveJSON(LS_MANIFESTS, next);
  }

  function addWin() {
    const t = newWin.trim(); if (!t) return;
    const item = { id: newId(), text: t, createdAt: new Date().toISOString() };
    const next = [item, ...wins];
    setWins(next); saveJSON(LS_WINS, next);
    setNewWin('');
  }
  function deleteWin(id) {
    const next = wins.filter(w => w.id !== id);
    setWins(next); saveJSON(LS_WINS, next);
  }

  // ---- UI ----
  return (
    <main style={{ maxWidth: 980, margin: '24px auto', padding: '0 10px' }}>
      <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>Profile</h1>
      <div style={{ color:'#475569', marginBottom: 16 }}>Let’s make your progress visible.</div>

      {/* Progress Tracker */}
      <section style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:16, padding:16, marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <strong style={{ fontSize:18 }}>Progress</strong>
          <div style={{ fontSize:12, padding:'4px 8px', border:'1px solid rgba(0,0,0,0.08)', borderRadius:999 }}>
            🔥 Streak: <b>{streak.count}</b> day{streak.count === 1 ? '' : 's'}
          </div>
        </div>
        <div style={{ height:10, background:'#f1f5f9', borderRadius:999, overflow:'hidden', marginBottom:8 }}>
          <div style={{ width:`${progress.pct}%`, height:'100%', background:'#10b981' }} />
        </div>
        <div style={{ fontSize:12, color:'#334155', marginBottom:10 }}>
          {progress.done}/{progress.total} complete • {progress.pct}%
        </div>
        <ul style={{ margin:0, paddingLeft:18, lineHeight:1.8 }}>
          <li>{checks.acceptedEthics ? '✅' : '⬜️'} Ethical agreement accepted</li>
          <li>{checks.pickedVibe ? '✅' : '⬜️'} Vibe selected {S?.vibe?.name ? `• ${S.vibe.name}` : ''}</li>
          <li>{checks.setIntention ? '✅' : '⬜️'} Intention saved from questionnaire/home</li>
          <li>{checks.capturedWish ? '✅' : '⬜️'} Current wish captured {S?.currentWish?.wish ? `• “${S.currentWish.wish}”` : ''}</li>
          <li>{checks.chattedOnce ? '✅' : '⬜️'} First conversation with Genie</li>
        </ul>
      </section>

      {/* Your Info */}
      <section style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
        <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:16, padding:16 }}>
          <strong style={{ display:'block', marginBottom:6 }}>Your info</strong>
          <div style={{ fontSize:14 }}><b>Name:</b> {S?.firstName || '—'}</div>
        </div>
        <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:16, padding:16 }}>
          <strong style={{ display:'block', marginBottom:6 }}>Current vibe</strong>
          <div style={{ fontSize:14 }}>{S?.vibe?.name || '—'}</div>
        </div>
        <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:16, padding:16 }}>
          <strong style={{ display:'block', marginBottom:6 }}>Intention</strong>
          <div style={{ fontSize:14, whiteSpace:'pre-wrap' }}>{S?.prompt_spec?.prompt || '—'}</div>
          {S?.prompt_spec?.savedAt && (
            <div style={{ marginTop:6, fontSize:12, color:'#64748b' }}>
              Saved {new Date(S.prompt_spec.savedAt).toLocaleString()}
            </div>
          )}
        </div>
        <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:16, padding:16 }}>
          <strong style={{ display:'block', marginBottom:6 }}>Today’s focus</strong>
          <div style={{ fontSize:14 }}>
            {S?.currentWish?.micro || '—'}
          </div>
        </div>
      </section>

      {/* Manifestation Board */}
      <section style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:16, padding:16, marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <strong style={{ fontSize:18 }}>Manifestation board</strong>
          <span style={{ fontSize:12, color:'#64748b' }}>{manifests.length} item{manifests.length===1?'':'s'}</span>
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input
            value={newWish}
            onChange={e=>setNewWish(e.target.value)}
            placeholder="Add a manifestation (e.g., land 3 high-ticket clients)"
            style={{ flex:1, padding:'10px 12px', borderRadius:10, border:'1px solid #e2e8f0' }}
          />
          <button onClick={addManifest} style={{ padding:'10px 14px', borderRadius:10, border:0, background:'#0ea5e9', color:'#fff', fontWeight:800 }}>
            Add
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {manifests.length === 0 ? (
            <div style={{ color:'#64748b' }}>No items yet.</div>
          ) : manifests.map(m => (
            <div key={m.id} style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:12, background:'#f8fafc' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div style={{ fontSize:12, color:'#64748b' }}>
                  {new Date(m.createdAt).toLocaleDateString()}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>toggleManifestStatus(m.id)} style={{ fontSize:12, padding:'4px 8px', borderRadius:8, border:'1px solid #cbd5e1', background:'#fff' }}>
                    {m.status === 'done' ? 'Mark Active' : 'Mark Done'}
                  </button>
                  <button onClick={()=>deleteManifest(m.id)} style={{ fontSize:12, padding:'4px 8px', borderRadius:8, border:'1px solid #fecaca', background:'#fff', color:'#ef4444' }}>
                    Delete
                  </button>
                </div>
              </div>
              <div style={{ fontWeight:700, marginBottom:6 }}>{m.text}</div>
              <div style={{ fontSize:12, color: m.status === 'done' ? '#16a34a' : '#0ea5e9' }}>
                {m.status === 'done' ? `✅ Completed ${m.doneAt ? new Date(m.doneAt).toLocaleDateString() : ''}` : 'In progress'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Wins */}
      <section style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:16, padding:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <strong style={{ fontSize:18 }}>Wins</strong>
          <span style={{ fontSize:12, color:'#64748b' }}>{wins.length} logged</span>
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input
            value={newWin}
            onChange={e=>setNewWin(e.target.value)}
            placeholder="Log a quick win (e.g., emailed 2 leads, finished a page)"
            style={{ flex:1, padding:'10px 12px', borderRadius:10, border:'1px solid #e2e8f0' }}
          />
          <button onClick={addWin} style={{ padding:'10px 14px', borderRadius:10, border:0, background:'#10b981', color:'#fff', fontWeight:800 }}>
            Add
          </button>
        </div>

        {wins.length === 0 ? (
          <div style={{ color:'#64748b' }}>No wins yet. Small steps count the most ✨</div>
        ) : (
          <ul style={{ listStyle:'none', padding:0, margin:0 }}>
            {wins.map(w => (
              <li key={w.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #e2e8f0', borderRadius:12, padding:'8px 10px', background:'#f8fafc', marginBottom:8 }}>
                <div>
                  <div style={{ fontWeight:700 }}>{w.text}</div>
                  <div style={{ fontSize:12, color:'#64748b' }}>{new Date(w.createdAt).toLocaleString()}</div>
                </div>
                <button onClick={()=>deleteWin(w.id)} style={{ fontSize:12, padding:'4px 8px', borderRadius:8, border:'1px solid #fecaca', background:'#fff', color:'#ef4444' }}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
