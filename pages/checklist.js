// /pages/checklist.js
import { useRouter } from 'next/router';
import { get, set } from '../src/flowState';

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

  return (
    <div style={styles.card}>
      <h1 style={{fontSize:26, fontWeight:900, margin:0}}>Do this now</h1>
      <p style={{opacity:.85}}>For: <b>{S.currentWish?.wish || 'your wish'}</b></p>

      <ul style={{listStyle:'none', paddingLeft:0, margin:'8px 0 12px'}}>
        {steps.map((s,i)=>(
          <li key={s.id} style={styles.li}>
            <label style={{display:'flex', gap:10, alignItems:'center', cursor:'pointer'}}>
              <input type="checkbox" checked={!!s.done} onChange={()=>toggle(s.id)} style={{width:18, height:18, accentColor:'#ffd600'}} />
              <span>{i+1}. {s.text}</span>
            </label>
          </li>
        ))}
      </ul>

      <div style={{display:'flex', gap:10, marginTop:8, flexWrap:'wrap'}}>
        <button
          onClick={enterChat}
          disabled={!allDone}
          style={{
            padding:'12px 16px', borderRadius:14, border:0,
            background: allDone ? '#ffd600' : '#ffe680', fontWeight:900, cursor: allDone ? 'pointer' : 'not-allowed'
          }}
        >
          All done → Enter chat
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
