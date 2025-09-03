// /pages/chat.js — compact chat console + HM redirect for Unlock (restored)
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { get, set, newId, pushThread, toPlainMessages } from '../src/flowState';
import { supabase } from '../src/supabaseClient';
import PrescriptionCard from "../components/ChatGenie/PrescriptionCard";
import { detectBeliefFrom, recommendProduct } from "../src/engine/recommendProduct";

function escapeHTML(s=''){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'" :'&#39;'}[m])); }
function nl2br(s=''){ return s.replace(/\n/g, '<br/>'); }

function pickFirstName(src){
  const first = (v)=> v ? String(v).trim().split(/\s+/)[0] : '';
  const cands = [
    src?.first_name, src?.firstName,
    src?.display_name, src?.displayName,
    src?.name,
    src?.full_name, src?.fullName
  ].map(first).filter(Boolean);
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
      // ⬇ keep the original context
      context: {
        wish: state.currentWish?.wish || null,
        block: state.currentWish?.block || null,
        micro: state.currentWish?.micro || null,
        vibe: state.vibe || null,
        // ⬇ NEW: pass prompt_spec intention too (when present)
        prompt_spec: state.prompt_spec?.prompt || null,
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
  const [uiOffer, setUiOffer] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    const cur = get();
    if (!cur.vibe) { router.replace('/vibe'); return; }
    if (!cur.currentWish) { router.replace('/flow'); return; }

    let lsName = '';
    try {
      const cached = localStorage.getItem('mg_first_name');
      if (cached && cached.trim() && cached !== 'Friend') {
        lsName = cached.trim();
        set({ firstName: lsName });
      }
    } catch {}

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (user) {
          const { data: p } = await supabase
            .from('profiles')
            .select('first_name, full_name')
            .eq('id', user.id)
            .maybeSingle();

          const { data: up } = await supabase
            .from('user_profile')
            .select('first_name, full_name')
            .eq('user_id', user.id)
            .maybeSingle();

          const best = pickFirstName({
            first_name: p?.first_name || up?.first_name,
            full_name: p?.full_name || up?.full_name,
            name: user.user_metadata?.name,
            display_name: user.user_metadata?.full_name
          }) || lsName;

          if (best && best !== 'Friend') {
            set({ firstName: best });
            try { localStorage.setItem('mg_first_name', best); } catch {}
          }
        }
      } catch {}

      const after = get();
      const intro = `🌟 The lamp glows softly… I’m here, ${after.firstName || 'Friend'}.
Sounds like you’ve been carrying a lot. I’d love to hear—what’s been on your mind most lately?`;

      if (!after.thread || after.thread.length === 0) {
        pushThread({ role: 'assistant', content: intro });
      } else {
        const t0 = after.thread[0];
        const looksOld =
          t0?.role === 'assistant' &&
          /what do you want to manifest|how do you feel about that|\bwhat'?s the snag\b/i.test(t0.content || '');
        if (looksOld) {
          const updated = [{ ...t0, content: intro }, ...after.thread.slice(1)];
          set({ thread: updated });
        }
      }
      setS(get());
    })();
  }, [router]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [S.thread, uiOffer]);

  async function send(){
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    setThinking(true);

    pushThread({ role:'user', content: text });
    setS(get());

    // Recommend + fixed HM link
    try {
      const { goal, belief } = detectBeliefFrom(text);
      const rec = recommendProduct({ goal, belief });
      if (rec) {
        const why = belief
          ? `Limiting belief detected: “${belief}.” Tonight’s session dissolves that pattern so your next action feels natural.`
          : `Based on your goal, this short trance helps you move without overthinking.`;
        const HM_LINK = "https://hypnoticmeditations.ai/b/l0kmb";
        setUiOffer({ title: rec.title, why, priceCents: rec.price, buyUrl: HM_LINK });
      }
    } catch {}

    try {
      const reply = await callGenie({ text, state: get() });
      pushThread({ role:'assistant', content: reply });
      setS(get());
    } catch {
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
    <div style={{ maxWidth: 980, margin: '12px auto', padding: '0 10px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:10 }}>
        <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:16, padding:10 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
            <div style={{ fontWeight:900, fontSize:18 }}>Genie Chat</div>
          </div>

          <div
            ref={listRef}
            style={{
              minHeight: 280,
              maxHeight: 420,
              overflowY: 'auto',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 12,
              padding: 10,
              background: '#f8fafc'
            }}
          >
            {(S.thread || []).map(m => {
              const isAI = m.role !== 'user';
              return (
                <div
                  key={m.id || newId()}
                  style={{
                    marginBottom: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isAI ? 'flex-start' : 'flex-end'
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: 4,
                      textAlign: isAI ? 'left' : 'right'
                    }}
                  >
                    {isAI ? 'Genie' : (S.firstName || 'You')}
                  </div>
                  <div
                    style={{
                      background: isAI ? 'rgba(0,0,0,0.04)' : 'rgba(255,214,0,0.15)',
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 12,
                      padding: '8px 10px',
                      maxWidth: '90%',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.4
                    }}
                    dangerouslySetInnerHTML={{ __html: nl2br(escapeHTML(m.content || '')) }}
                  />
                </div>
              )
            })}

            {uiOffer ? (
              <div style={{ marginTop: 8 }}>
                <PrescriptionCard
                  title={uiOffer.title}
                  why={uiOffer.why}
                  priceCents={uiOffer.priceCents}
                  buyUrl={uiOffer.buyUrl || "https://hypnoticmeditations.ai/b/l0kmb"}
                  onClose={() => setUiOffer(null)}
                />
              </div>
            ) : null}

            {thinking && (
              <div style={{ opacity:.7, fontStyle:'italic', marginTop:6 }}>Genie is thinking…</div>
            )}
          </div>

          <div style={{ display:'flex', gap:8, marginTop:10 }}>
            <textarea
              rows={1}
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={`Speak to your Genie, ${S.firstName || 'Friend'}…`}
              style={{
                flex:1,
                padding:'10px 12px',
                borderRadius:12,
                border:'1px solid rgba(0,0,0,0.15)',
                resize:'vertical'
              }}
            />
            <button
              onClick={send}
              style={{
                padding:'10px 14px',
                borderRadius:12,
                border:0,
                background:'#ffd600',
                fontWeight:900
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
