
// /pages/checklist.js
import { useRouter } from 'next/router';
import { get, set } from '../src/flowState';
import { copy } from '../src/genieCopy';

const styles = {
  card: { background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:18, padding:24 },
  li: { padding:'10px 12px', borderRadius:12, background:'rgba(0,0,0,0.03)', marginBottom:8, border:'1px solid rgba(0,0,0,0.08)' }
};

export default function ChecklistPage(){
  const router = useRouter();
  const S = get();
  const steps = S.steps || [];
  const allDone = steps.length > 0 && steps.every(s => s.done);

  const toggle = (id) => {
    const next = steps.map(s => s.id === id ? { ...s, done: !s.done } : s);
    set({ steps: next });
  };

  const enterChat = () => { set({ phase:'chat' }); router.push('/chat'); };
  const skip = () => { set({ phase:'chat' }); router.push('/chat'); };

  const labels = copy.checklist.labels();

  return (
    <div style={styles.card}>
      <h1 style={{fontSize:28, fontWeight:900, margin:0}}>Checklist</h1>
      <p style={{whiteSpace:'pre-line', margin:'8px 0 10px'}}>{copy.checklist.caught(S?.currentWish?.wish || '')}</p>
      <p style={{margin:'8px 0 10px'}}>{copy.checklist.pathLead()}</p>

      <ul style={{listStyle:'none', padding:0, margin:'12px 0'}}>
        {steps.map(s => (
          <li key={s.id} style={styles.li}>
            <label style={{display:'flex', alignItems:'center', gap:10}}>
              <input type="checkbox" checked={!!s.done} onChange={()=>toggle(s.id)} />
              <span>{s.text}</span>
            </label>
          </li>
        ))}
      </ul>

      <p style={{opacity:.7}}>{copy.checklist.doneNote()}</p>

      <div style={{display:'flex', gap:12, marginTop:8}}>
        <button
          onClick={enterChat}
          disabled={!allDone}
          style={{ padding:'12px 16px', borderRadius:14, border:0, background: allDone ? '#ffd600' : '#ffe680', fontWeight:820, cursor: allDone ? 'pointer' : 'not-allowed' }}
        >
          {copy.checklist.toChat()} →
        </button>
        <button
          onClick={skip}
          style={{ padding:'12px 16px', borderRadius:14, border:'1px solid rgba(0,0,0,0.2)', background:'transparent', fontWeight:820 }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
