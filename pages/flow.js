
// /pages/flow.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { get, set } from '../src/flowState';
import { generateChecklist } from '../src/checklistGen';
import { copy } from '../src/genieCopy';

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
    const currentWish = { wish: wish.trim(), block: block.trim(), micro: micro.trim(), vibe: S.vibe, date: new Date().toISOString() };
    const steps = generateChecklist(currentWish);
    set({ currentWish, lastWish: currentWish, steps, phase:'checklist' });
    router.push('/checklist');
  };

  const guards = copy.intake.guardrails();

  return (
    <div style={styles.card}>
      <h1 style={{fontSize:28, fontWeight:900, margin:0}}>Wish Intake</h1>
      <p style={{margin:'8px 0 10px', opacity:.9}}>{copy.intake.lead()}</p>

      <p style={{margin:'12px 0 6px'}}>{copy.intake.ask()}</p>
      <input style={styles.input} value={wish} onChange={e=>setWish(e.target.value)} placeholder={copy.intake.placeholder()} />

      <p style={{margin:'12px 0 6px'}}>What’s in the way?</p>
      <textarea rows={2} style={styles.input} value={block} onChange={e=>setBlock(e.target.value)} placeholder="Say the snag. Simple + true." />

      <p style={{margin:'12px 0 6px'}}>What’s 1 micro-move you can make today?</p>
      <input style={styles.input} value={micro} onChange={e=>setMicro(e.target.value)} placeholder="Send it. Start it. Ship it." />

      <ul style={{marginTop:12, paddingLeft:18, color:'rgba(0,0,0,.66)', fontSize:14}}>
        {guards.map((g,i)=>(<li key={i} style={{marginBottom:4}}>{g}</li>))}
      </ul>

      <button onClick={lock} disabled={!can} style={{
        marginTop:14, padding:'12px 16px', borderRadius:14, border:0,
        background: can ? '#ffd600' : '#ffe680', fontWeight:900, cursor: can ? 'pointer' : 'not-allowed'
      }}>
        {copy.intake.lock()} →
      </button>
    </div>
  );
}
