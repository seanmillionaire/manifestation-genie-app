// /pages/chat.js — debug first-name sources, no console
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { get, set, newId, pushThread, toPlainMessages } from '../src/flowState';
import { supabase } from '../src/supabaseClient';
import FomoFeed from '../components/FomoFeed';

function escapeHTML(s=''){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'" :'&#39;'}[m])); }
function nl2br(s=''){ return s.replace(/\n/g, '<br/>'); }

// choose the best available first name from many fields
function pickFirstName(src){
  const tryFirst = (v)=> v ? String(v).trim().split(/\s+/)[0] : '';
  const cands = [
    src?.first_name, src?.firstName, // snake & camel
    src?.display_name, src?.displayName,
    src?.name,
    src?.full_name, src?.fullName
  ].map(tryFirst).filter(Boolean);
  for (const c of cands){
    const t = c.trim();
    if (!t) continue;
    if (t.toLowerCase() === 'friend') continue;
    if (/[0-9_@]/.test(t)) continue;
    return t[0].toUpperCase() + t.slice(1);
  }
  return '';
}

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

  // DEBUG state: show all places we’re pulling name from
  const [D, setD] = useState({
    snapFirst: get().firstName,
    stateFirst: S.firstName,
    lsFirst: '(n/a)',
    profFirst: '(loading)',
    profFull: '(loading)',
    upFirst: '(loading)',
    authEmail: '(loading)'
  });

  // hydrate name BEFORE creating first assistant line; also fill debug fields
  useEffect(() => {
    const cur = get();

    if (!cur.vibe) { router.replace('/vibe'); return; }
    if (!cur.currentWish) { router.replace('/flow'); return; }

    // 1) localStorage first
    let lsName = '';
    try {
      const cached = localStorage.getItem('mg_first_name');
      if (cached && cached.trim() && cached !== 'Friend') {
        lsName = cached.trim();
        set({ firstName: lsName });
      }
    } catch {}

    // 2) Supabase profile rows
    (async () => {
      let authEmail = '';
      let profFirst = '';
      let profFull = '';
      let upFirst = '';

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (user) {
          authEmail = user.email || '';

          // profiles
          const { data: p } = await supabase
            .from('profiles')
            .select('first_name, full_name')
            .eq('id', user.id)
            .maybeSingle();

          profFirst = p?.first_name || '';
          profFull  = p?.full_name || '';

          // user_profile (if exists)
          const { data: up } = await supabase
            .from('user_profile')
            .select('first_name, full_name')
            .eq('user_id', user.id)
            .maybeSingle();

          upFirst = up?.first_name || '';

          // decide best name and push to store/cache
          const best = pickFirstName({
            first_name: profFirst || upFirst,
            full_name: profFull || up?.full_name,
            name: user.user_metadata?.name,
            display_name: user.user_metadata?.full_name
          }) || lsName;

          if (best && best !== 'Friend') {
            set({ firstName: best });
            try { localStorage.setItem('mg_first_name', best); } catch {}
          }
        }
      } catch {}

      // create first line if empty (after we tried to know the name)
      const after = get();
      if (!after.thread || after.thread.length === 0){
        pushThread({
          role:'assistant',
          content: `The lamp glows… I’m here, ${after.firstName || 'Friend'}.\nOne tiny move today beats a thousand tomorrows. What’s the snag we’ll clear right now?`
        });
      } else {
        // patch "Friend" to real name if needed
        const hasReal = after.firstName && after.firstName !== 'Friend';
        const t0 = after.thread?.[0];
        if (hasReal && t0?.role === 'assistant' && /I’m here,\s*Friend\b/.test(t0.content || '')) {
          const fixed = { ...t0, content: t0.content.replace(/I’m here,\s*Friend\b/, `I’m here, ${after.firstName}`) };
          set({ thread: [fixed, ...after.thread.slice(1)] });
        }
      }

      // reflect latest store + debug
      const snap = get();
      setS(snap);
      setD({
        snapFirst: snap.firstName,
        stateFirst: snap.firstName,     // now same as S after setS(snap)
        lsFirst: lsName || (typeof window !== 'undefined' ? (localStorage.getItem('mg_first_name') || '(empty)') : '(server)'),
        profFirst: profFirst || '(null)',
        profFull: profFull || '(null)',
        upFirst: upFirst || '(null)',
        authEmail: authEmail || '(null)'
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // keep list scrolled
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [S.thread]);

  async function send(){
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    setThinking(true);

    pushThread({ role:'user', author: (get().firstName || 'You'), content: text });
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
      {/* DEBUG PANEL — which name is actually filled? */}
      <div style={{padding:12, background:'#ffe5e5', border:'1px solid #ffb3b3', borderRadius:8, margin:'10px 0', fontFamily:'monospace'}}>
        <div>flowState.get().firstName: <b>{D.snapFirst || '(empty)'}</b></div>
        <div>Component state S.firstName: <b>{D.stateFirst || '(empty)'}</b></div>
        <div>localStorage.mg_first_name: <b>{D.lsFirst || '(empty)'}</b></div>
        <div>profiles.first_name: <b>{D.profFirst}</b></div>
        <div>profiles.full_name: <b>{D.profFull}</b></div>
        <div>user_profile.first_name: <b>{D.upFirst}</b></div>
        <div>auth.users.email: <b>{D.authEmail}</b></div>
      </div>

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
