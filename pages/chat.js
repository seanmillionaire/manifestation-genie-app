// /pages/chat.js
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { get, set, newId, normalizeMsg, pushThread, toPlainMessages } from '../src/flowState';

function escapeHTML(s=''){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function nl2br(s=''){ return s.replace(/\n/g, '<br/>'); }

async function callGenie({ text, state }) {
  const resp = await fetch('/api/chat', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({
      userName: state.firstName || null,
      context: {
        wish: state.currentWish?.wish || null,
        block: state.currentWish?.block || null,
        micro: state.currentWish?.micro || null,
        vibe: state.vibe || null
      },
      messages: [
        ...toPlainMessages(state.thread),
        { role:'user', content: text }
      ]
    })
  });
  const data = await resp.json();
  return (data && (data.reply || data.text)) || 'As you wish—what exactly do you want?';
}

export default function ChatPage(){
  const router = useRouter();
  const [S, setS] = useState(get());
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  // 🔒 Lock the first name we had at first paint (don’t let later effects overwrite it)
  const nameRef = useRef(() => {
    const cur = get();
    const cached = typeof window !== 'undefined' ? localStorage.getItem('mg_first_name') : null;
    return cur.firstName || cached || 'Friend';
  })();
  // (Optional) push it back into flowState once so API always gets it
  useEffect(() => {
    const cur = get();
    if (nameRef && nameRef !== 'Friend' && cur.firstName !== nameRef) {
      set({ firstName: nameRef });
      setS(get());
    }
  }, []);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}); }, [S.thread]);

  useEffect(()=>{
    // Redirect if user skipped earlier pages (no vibe or no wish)
    const cur = get();
    if (!cur.vibe) return router.replace('/vibe');
    if (!cur.currentWish) return router.replace('/flow');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ❌ removed the hydration effect that could overwrite with "Friend"

  const send = async () => {
    const text = (input || '').trim();
    if (!text) return;

    // push user message using the locked name
    const userMsg = normalizeMsg(
      { id:newId(), role:'user', author:nameRef || 'You', content: escapeHTML(text) },
      nameRef
    );
    const thread = [...(S.thread || []), userMsg];
    set({ thread });
    setS(get());
    setInput('');

    try {
      // force API payload to use the locked name
      const current = get();
      const reply = await callGenie({ text, state: { ...current, firstName: nameRef } });
      const ai = normalizeMsg({ role:'assistant', author:'Genie', content: nl2br(escapeHTML(reply)) }, nameRef);
      pushThread(ai);
      setS(get());
    } catch {
      const ai = normalizeMsg({ role:'assistant', author:'Genie', content: 'The lamp flickered. Try again.' }, nameRef);
      pushThread(ai);
      setS(get());
    }
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:18, padding:16 }}>
      <h1 style={{fontSize:24, fontWeight:900, margin:'4px 0 8px'}}>
        Genie Chat, {nameRef || 'Friend'}
      </h1>

      <div style={{
        minHeight:360, maxHeight:520, overflowY:'auto',
        border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, padding:12, background:'#fafafa'
      }}>
        {(S.thread || []).map(m => {
          const isAI = m.role === 'assistant';
          return (
            <div key={m.id} style={{ display:'flex', gap:8, margin:'8px 0', flexDirection: isAI ? 'row' : 'row-reverse' }}>
              <div style={{
                width:30, height:30, borderRadius:'50%', background:'rgba(0,0,0,0.05)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:16
              }}>{isAI ? '🔮' : '🙂'}</div>

              <div style={{maxWidth:'80%'}}>
                <div style={{
                  fontSize:12, opacity:.65, margin: isAI ? '0 0 4px 6px' : '0 6px 4px 0',
                  textAlign: isAI ? 'left' : 'right'
                }}>{isAI ? 'Genie' : (m.author || nameRef || 'You')}</div>

                <div
                  style={{
                    background: isAI ? 'rgba(0,0,0,0.04)' : 'rgba(255,214,0,0.15)',
                    border:'1px solid rgba(0,0,0,0.08)', borderRadius:12,
                    padding:'10px 12px'
                  }}
                  dangerouslySetInnerHTML={{ __html: m.content }}
                />
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div style={{display:'flex', gap:10, marginTop:10}}>
        <textarea
          rows={2}
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={`Speak to your Genie, ${nameRef || 'Friend'}…`}
          style={{flex:1, padding:'12px 14px', borderRadius:12, border:'1px solid rgba(0,0,0,0.15)'}}
        />
        <button onClick={send} style={{ padding:'12px 16px', borderRadius:14, border:0, background:'#ffd600', fontWeight:900 }}>
          Send
        </button>
      </div>
    </div>
  );
}
