// /pages/chat.js — clean (no debug), hydrated name, no frozen author
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { get, set, newId, pushThread, toPlainMessages } from '../src/flowState';
import { supabase } from '../src/supabaseClient';
import FomoFeed from '../components/FomoFeed';
import PrescriptionCard from "../components/ChatGenie/PrescriptionCard";
import { detectBeliefFrom, recommendProduct } from "../src/engine/recommendProduct";

function escapeHTML(s=''){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'" :'&#39;'}[m])); }
function nl2br(s=''){ return s.replace(/\n/g, '<br/>'); }

// pick the best available first name from any source
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
  const [uiOffer, setUiOffer] = useState(null);
  const listRef = useRef(null);

  // hydrate name BEFORE creating the first assistant line (no debug)
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

    // 2) Supabase rows
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (user) {
          // profiles
          const { data: p } = await supabase
            .from('profiles')
            .select('first_name, full_name')
            .eq('id', user.id)
            .maybeSingle();

          // user_profile (optional)
          const { data: up } = await supabase
            .from('user_profile')
            .select('first_name, full_name')
            .eq('user_id', user.id)
            .maybeSingle();

          // decide best name and push to store/cache
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

// 3) ensure first assistant line uses belief-breaker intro
const after = get();
const intro = `🌟 The lamp glows… I’m here, ${after.firstName || 'Friend'}.
If you’ve felt stuck—working hard, juggling stress, or doubting yourself—we’ll flip the limiting belief behind it.
One tiny move today beats a thousand tomorrows. What belief or snag should we clear right now?`;

if (!after.thread || after.thread.length === 0) {
  // no messages yet → set our intro
  pushThread({ role: 'assistant', content: intro });
} else {
  // already has a first message → replace old generic prompts with our intro
  const t0 = after.thread[0];
  const looksOld =
    t0?.role === 'assistant' &&
    /what do you want to manifest|how do you feel about that|\bwhat'?s the snag\b/i.test(t0.content || '');

  if (looksOld) {
    const updated = [{ ...t0, content: intro }, ...after.thread.slice(1)];
    set({ thread: updated });
  }
}


      // reflect latest store in this component
      setS(get());
    })();
  }, [router]);

  // keep list scrolled
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [S.thread, uiOffer]);

  async function send(){
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    setThinking(true);

    // don't freeze author; derive label at render
    pushThread({ role:'user', content: text });
    setS(get());

    // 1) belief detection + recommend
    try {
      const { goal, belief } = detectBeliefFrom(text);
      const rec = recommendProduct({ goal, belief });

      if (rec) {
        const why = belief
          ? `Limiting belief detected: “${belief}.” Tonight’s session dissolves that pattern so your next action feels natural.`
          : `Based on your goal, this short trance helps you move without overthinking.`;

        setUiOffer({
          title: `Tonight’s prescription: ${rec.title}`,
          why,
          priceCents: rec.price,
          previewUrl: rec.preview,
          sku: rec.sku,
          stripe_price_id: rec.stripe_price_id,
        });
      }
    } catch {}

    // 2) call Genie
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
            <button onClick={()=>{ set({ thread: [] }); setS(get()); }} style={{border:'1px solid rgba(0,0,0,0.12)', borderRadius:8, padding:'6px 10px', background:'#fff', cursor:'pointer'}}>
              New belief to clear
            </button>
          </div>

          <div ref={listRef} style={{minHeight:360, maxHeight:520, overflowY:'auto', border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, padding:12, background:'#f8fafc'}}>
            {(S.thread || []).map(m => {
              const isAI = m.role !== 'user';
              return (
                <div key={m.id || newId()} style={{ marginBottom:12, display:'flex', flexDirection:'column', alignItems: isAI ? 'flex-start' : 'flex-end' }}>
                  <div style={{fontSize:12, fontWeight:700, color:'#334155', marginBottom:6, textAlign: isAI ? 'left' : 'right'}}>
                    {isAI ? 'Genie' : (S.firstName || 'You')}
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

            {/* Offer card goes OUTSIDE the .map, after the messages */}
            {uiOffer ? (
              <div style={{ marginTop: 12 }}>
                <PrescriptionCard
                  title={uiOffer.title}
                  why={uiOffer.why}
                  priceCents={uiOffer.priceCents}
                  previewUrl={uiOffer.previewUrl}
                  onUnlock={async () => {
                    const used = localStorage.getItem("mg_free_session_used");
                    if (!used) {
                      localStorage.setItem("mg_free_session_used", "1");
                      alert("Enjoy a free listen! (Payments coming soon)");
                      return;
                    }
                    const res = await fetch("/api/checkout", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ sku: uiOffer.sku }),
                    });
                    const data = await res.json();
                    if (data?.url) window.location.href = data.url;
                  }}
                />
              </div>
            ) : null}

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
