// /pages/chat.js — instant first reply + proof strip
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { get, set, subscribe, newId, normalizeMsg, pushThread, toPlainMessages } from '../src/flowState';
import { supabase } from '../src/supabaseClient';
import FomoFeed from '../components/FomoFeed'

function escapeHTML(s=''){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'" :'&#39;'}[m])); }
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
      messages: toPlainMessages(state.thread || []),
      text
    })
  });
  if (!resp.ok) throw new Error('Genie API error');
  const data = await resp.json();
  return data?.reply || 'I’m here.';
}

export default function ChatPage(){
  const router = useRouter();
  const [S, setS] = useState(get());
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const listRef = useRef(null);

  // 🔁 subscribe so this page updates when firstName/thread change
  useEffect(() => {
    const unsub = subscribe((next) => {
      if (
        next?.firstName &&
        next.firstName !== 'Friend' &&
        Array.isArray(next.thread) &&
        next.thread.length > 0 &&
        next.thread[0].role === 'assistant' &&
        /I’m here,\s*Friend\b/.test(next.thread[0].content || '')
      ) {
        const firstMsg = { ...next.thread[0] };
        firstMsg.content = firstMsg.content.replace(/I’m here,\s*Friend\b/, `I’m here, ${next.firstName}`);
        set({ thread: [firstMsg, ...next.thread.slice(1)] });
        return;
      }
      setS(next);
    });
    return () => unsub?.();
  }, []);

  useEffect(() => {
    const cur = get();
    if (!cur.vibe) { router.replace('/vibe'); return; }
    if (!cur.currentWish) { router.replace('/flow'); return; }

    if (!cur.thread || cur.thread.length === 0){
      pushThread({
        role:'assistant',
        content: `The lamp glows… I’m here, ${cur.firstName || 'Friend'}.\nOne tiny move today beats a thousand tomorrows. What’s the snag we’ll clear right now?`
      });
      setS(get());
    }
  }, [router]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [S.thread]);

  async function send(){
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    setThinking(true);

    pushThread({ role:'user', author: S.firstName || 'You', content: text });
    setS(get());

    try {
      const reply = await callGenie({ text, state: get() });
      pushThread({ role:'assistant', content: reply });
      setS(get());
    } catch (err) {
      pushThread({ role:'assistant', content: 'The lamp flickered. Try again in a moment.' });
      setS(get());
    } finally {
      setThinking(false);
    }
  }

  function onKey(e){
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); send();
    }
  }

  return (
    <div style={{maxWidth:980, margin:'24px auto', padding:'0 14px'}}>
      <div style={{display:'grid', gridTemplateColumns:'1fr', gap:14}}>
        <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:18, padding:16 }}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
            <div style={{fontWeight:900, fontSize:18}}>Genie Chat</div>
            <button onClick={()=>{ set({ thread: [] }); setS(get()); }} style={{border:'1px solid rgba(0,0,0,0.12)', borderRadius:8, padding:'6px 10px', background:'#fff', cursor:'pointer'}}>New wish</button>
          </div>

          <div ref={listRef} style={{minHeight:360, maxHeight:520, overflowY:'auto', border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, padding:12, background:'#f8fafc'}}>
            {(S.thread || []).map(m => {
              const isAI = m.role !== 'user';
              return (
                <div key={m.id || newId()} style={{ marginBottom:12, display:'flex', flexDirection:'column', alignItems: isAI ? 'flex-start' : 'flex-end' }}>
                  <div style={{fontSize:12, fontWeight:700, color:'#334155', marginBottom:6, textAlign: isAI ? 'left' : 'right'}}>
                    {isAI ? 'Genie' : (m.author || S.firstName || 'You')}
                  </div>
                  <div
                    style={{
                      background: isAI ? 'rgba(0,0,0,0.04)' : 'rgba(255,214,0,0.15)',
                      border:'1px solid rgba(0,0,0,0.08)',
                      borderRadius:12, padding:'10px 12px',
                      maxWidth:'78%', whiteSpace:'pre-wrap', lineHeight:1.4
                    }}
                    dangerouslySetInnerHTML={{ __html: nl2br(escapeHTML(m.content || '')) }}
                  />
                </div>
              )
            })}
            {thinking && (
              <div style={{opacity:.7, fontStyle:'italic'}}>Genie is thinking…</div>
            )}
          </div>

          <div style={{display:'flex', gap:10, marginTop:12}}>
            <textarea
              rows={2}
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={`Speak to your Genie, ${S.firstName || 'Friend'}…`}
              style={{flex:1, padding:'12px 14px', borderRadius:12, border:'1px solid rgba(0,0,0,0.15)'}}
            />
            <button onClick={send} style={{ padding:'12px 16px', borderRadius:14, border:0, background:'#ffd600', fontWeight:900 }}>
              Send
            </button>
          </div>
        </div>

        <div>
          <FomoFeed />
        </div>
      </div>
    </div>
  );
}
