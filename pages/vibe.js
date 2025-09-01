// /pages/vibe.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { get, set } from '../src/flowState';

const styles = {
  card: { background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:18, padding:24 },
  lead: { fontSize:18, opacity:.9 },
  row: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginTop:12 },
  btn: { padding:'14px 16px', borderRadius:14, border:'1px solid rgba(0,0,0,0.12)', background:'#fff', cursor:'pointer' }
};

export default function Vibe(){
  const router = useRouter();
  const [firstName, setFirstName] = useState('Friend');

  useEffect(() => { setFirstName(get().firstName || 'Friend'); }, []);

  const pick = (v) => {
    set({ vibe: v, phase:'resumeNew' });
    router.push('/onboard');
  };

  return (
    <div style={styles.card}>
      <h1 style={{fontSize:28, fontWeight:900, margin:0}}>Pick your vibe</h1>
      <p style={styles.lead}>What are we feeling today, {firstName}?</p>
      <div style={styles.row}>
        <button style={styles.btn} onClick={()=>pick('BOLD')}>🔥 BOLD</button>
        <button style={styles.btn} onClick={()=>pick('CALM')}>🙏 CALM</button>
        <button style={styles.btn} onClick={()=>pick('RICH')}>💰 RICH</button>
      </div>
    </div>
  );
}
