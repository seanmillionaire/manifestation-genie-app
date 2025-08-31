// /pages/flow.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { get, set } from '../src/flowState';
import { generateChecklist } from '../src/checklistGen';

const styles = {
  card: { background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:18, padding:24 },
  input: { width:'100%', padding:'12px 14px', borderRadius:12, border:'1px solid rgba(0,0,0,0.15)' }
};

export default function Flow(){
  const router = useRouter();
  const S = get();
  const init = S.currentWish || { wish:'', block:'', micro:'' };

  const [wish, setWish]   = useState(init.wish || '');
  const [block, setBlock] = useState(init.block || '');
  const [micro, setMicro] = useState(init.micro || '');

  const can = wish.trim() && micro.trim();

  const lock = () => {
    const current = { wish: wish.trim(), block: block.trim(), micro: micro.trim(), vibe: S.vibe, date: new Date().toISOString().slice(0,10) };
    const steps = generateChecklist(current);
    set({ currentWish: current, lastWish: current, steps, phase:'checklist' });
    router.push('/checklist');
  };

  return (
    <div style={styles.card}>
      <h1 style={{fontSize:28, fontWeight:900, margin:0}}>Your plan for today</h1>

      <p style={{margin:'12px 0 6px'}}>What’s the outcome you want?</p>
      <textarea rows={3} style={styles.input} value={wish} onChange={e=>setWish(e.target.value)} placeholder="One line. No fluff." />

      <p style={{margin:'12px 0 6px'}}>What’s blocking you?</p>
      <textarea rows={2} style={styles.input} value={block} onChange={e=>setBlock(e.target.value)} placeholder="Say the snag. Simple + true." />

      <p style={{margin:'12px 0 6px'}}>What’s 1 micro-move you can make today?</p>
      <input style={styles.input} value={micro} onChange={e=>setMicro(e.target.value)} placeholder="Send it. Start it. Ship it." />

      <button onClick={lock} disabled={!can} style={{
        marginTop:14, padding:'12px 16px', borderRadius:14, border:0,
        background: can ? '#ffd600' : '#ffe680', fontWeight:900, cursor: can ? 'pointer' : 'not-allowed'
      }}>
        Lock it in →
      </button>
    </div>
  );
}
