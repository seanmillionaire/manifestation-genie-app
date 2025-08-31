// /pages/onboard.js
import { useRouter } from 'next/router';
import { get, set } from '../src/flowState';

const box = { background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:18, padding:24 };

export default function Onboard(){
  const router = useRouter();
  const S = get();
  const last = S.lastWish || S.currentWish;

  const resume = () => {
    if (last) {
      set({ currentWish: last });
      if ((S.steps || []).length) router.push('/checklist');
      else router.push('/flow');
    } else {
      router.push('/flow');
    }
  };

  const fresh = () => {
    set({ currentWish: null, steps: [] });
    router.push('/flow');
  };

  return (
    <div style={box}>
      <h1 style={{fontSize:28, fontWeight:900, margin:0}}>Continue or start new?</h1>

      <div style={{display:'flex', gap:12, marginTop:14, flexWrap:'wrap'}}>
        <button style={btn()} onClick={resume}>Continue last wish</button>
        <button style={btn('ghost')} onClick={fresh}>Start new wish</button>
      </div>

      {last && (
        <div style={{
          marginTop:14, padding:12, border:'1px dashed rgba(0,0,0,0.2)',
          borderRadius:12, background:'rgba(255,214,0,0.06)'
        }}>
          <div><b>Last wish:</b> {last.wish}</div>
          <div><b>Vibe:</b> {last.vibe || S.vibe}</div>
          <div><b>Last step:</b> {last.micro}</div>
        </div>
      )}
    </div>
  );
}

function btn(variant){
  if (variant==='ghost') {
    return { padding:'12px 16px', borderRadius:14, border:'1px solid rgba(0,0,0,0.2)', background:'transparent', fontWeight:800, cursor:'pointer' };
  }
  return { padding:'12px 16px', borderRadius:14, border:0, background:'#ffd600', fontWeight:900, cursor:'pointer' };
}
