// /pages/chat.js — compact chat console + HM redirect for Unlock (debug + daily/session offer gate)
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { get, set, newId, pushThread, toPlainMessages } from '../src/flowState';
import { supabase } from '../src/supabaseClient';
import PrescriptionCard from "../components/ChatGenie/PrescriptionCard";
import { detectBeliefFrom, recommendProduct } from "../src/engine/recommendProduct";

// ---------- tiny helpers ----------
function escapeHTML(s=''){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'" :'&#39;'}[m])); }
function nl2br(s=''){ return s.replace(/\n/g, '<br/>'); }
function pretty(o){ try { return JSON.stringify(o, null, 2); } catch { return String(o); } }

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

// ---------- offer gating (once per day + once per session) ----------
const HM_LINK = "https://hypnoticmeditations.ai/b/l0kmb";
function todayKey(){ return new Date().toISOString().slice(0,10); } // YYYY-MM-DD
function shouldShowOfferNow(){
  try {
    if (typeof window === 'undefined') return false;
    const shownSession = sessionStorage.getItem('mg_offer_shown_session') === '1';
    const shownDay = localStorage.getItem('mg_offer_day') === todayKey();
    return !(shownSession || shownDay);
  } catch { return true; }
}
function markOfferShown(){
  try {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('mg_offer_shown_session', '1');
    localStorage.setItem('mg_offer_day', todayKey());
  } catch {}
}

export default function ChatPage(){
  const router = useRouter();
  const [S, setS] = useState(get());
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [uiOffer, setUiOffer] = useState(null);
  const [debugOn, setDebugOn] = useState(false);
  const [lastChatPayload, setLastChatPayload] = useState(null);
  const listRef = useRef(null);

  // auto-enable debug via ?debug=1
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      if (q.get('debug') === '1') setDebugOn(true);
    }
  }, []);

  // boot + greet + pull name + keep design
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

  // keep scroll pinned
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [S.thread, uiOffer]);

  // ------- central API caller: sets lastChatPayload BEFORE calling /api/chat -------
  async function callGenie({ text }) {
    const stateNow = get(); // include just-pushed user msg
    const payload = {
      userName: stateNow.firstName || null,
      context: {
        wish: stateNow.currentWish?.wish || null,
        block: stateNow.currentWish?.block || null,
        micro: stateNow.currentWish?.micro || null,
        vibe: stateNow.vibe || null,
        prompt_spec: stateNow.prompt_spec?.prompt || null, // intention from questionnaire/home
      },
      messages: toPlainMessages(stateNow.thread || []),
      text
    };

    // 🔥 update debug panel
    setLastChatPayload(payload);

    const resp = await fetch('/api/chat', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error('Genie API error');
    const data = await resp.json();
    return data?.reply || 'I’m here.';
  }

  async function send(){
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    setThinking(true);

    // 1) push user message into flowState (so callGenie sees it)
    pushThread({ role:'user', content: text });
    setS(get());

    // 2) product recommend (respect daily/session gate)
    try {
      const combined = S?.prompt_spec?.prompt
        ? `${S.prompt_spec.prompt}\n\nUser: ${text}`
        : text;
      const { goal, belief } = detectBeliefFrom(combined);
      const rec = recommendProduct({ goal, belief });

      if (rec && shouldShowOfferNow()) {
        setUiOffer({
          title: rec.title,
          why: belief
            ? `Limiting belief detected: “${belief}.” Tonight’s session dissolves that pattern so your next action feels natural.`
            : `Based on your goal, this short trance helps you move without overthinking.`,
          priceCents: rec.price,
          buyUrl: HM_LINK
        });
        markOfferShown(); // prevent repeat this session/day
      }
    } catch {}

    // 3) call Genie API
    try {
      const reply = await callGenie({ text });
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
    <>
      {/* ---- DEBUG PILL + PANEL ---- */}
      <div style={{ display:'flex', justifyContent:'center', margin:'10px 0' }}>
        <button
          onClick={() => setDebugOn(v => !v)}
          style={{
            fontSize:12, fontWeight:800, letterSpacing:.3,
            background: debugOn ? '#dcfce7' : '#e5e7eb',
            color: '#111', border:'1px solid rgba(0,0,0,0.15)',
            borderRadius: 999, padding:'6px 10px', cursor:'pointer'
          }}
          aria-pressed={debugOn}
        >
          Debug: {debugOn ? 'ON' : 'OFF'}
        </button>
      </div>

      {debugOn && (
        <div style={{
          maxWidth: 980, margin:'0 auto 10px', padding:12,
          background:'#0b1220', color:'#e5e7eb',
          border:'1px solid rgba(255,255,255,0.12)', borderRadius:12
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <strong>Live FlowState Snapshot</strong>
            <button
              onClick={() => {
                try {
                  const snapshot = {
                    firstName: S.firstName || null,
                    vibe: S.vibe || null,
                    currentWish: S.currentWish || null,
                    prompt_spec: S.prompt_spec || null,
                    lastChatPayload
                  };
                  navigator.clipboard?.writeText(JSON.stringify(snapshot, null, 2));
                } catch {}
              }}
              style={{
                fontSize:12, padding:'4px 8px', borderRadius:8,
                border:'1px solid rgba(255,255,255,0.15)', background:'transparent', color:'#e5e7eb',
                cursor:'pointer'
              }}
            >
              Copy JSON
            </button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10 }}>
            <div style={{ background:'#0f172a', padding:10, borderRadius:8 }}>
              <div style={{ fontSize:12, opacity:.8, marginBottom:6 }}>firstName</div>
              <pre style={{ margin:0, fontSize:12, whiteSpace:'pre-wrap' }}>{pretty(S.firstName)}</pre>
            </div>

            <div style={{ background:'#0f172a', padding:10, borderRadius:8 }}>
              <div style={{ fontSize:12, opacity:.8, marginBottom:6 }}>vibe</div>
              <pre style={{ margin:0, fontSize:12, whiteSpace:'pre-wrap' }}>{pretty(S.vibe)}</pre>
            </div>

            <div style={{ background:'#0f172a', padding:10, borderRadius:8 }}>
              <div style={{ fontSize:12, opacity:.8, marginBottom:6 }}>currentWish</div>
              <pre style={{ margin:0, fontSize:12, whiteSpace:'pre-wrap' }}>{pretty(S.currentWish)}</pre>
            </div>

            <div style={{ background:'#0f172a', padding:10, borderRadius:8 }}>
              <div style={{ fontSize:12, opacity:.8, marginBottom:6 }}>prompt_spec</div>
              <pre style={{ margin:0, fontSize:12, whiteSpace:'pre-wrap' }}>{pretty(S.prompt_spec)}</pre>
            </div>

            <div style={{ gridColumn:'1 / span 2', background:'#0f172a', padding:10, borderRadius:8 }}>
              <div style={{ fontSize:12, opacity:.8, marginBottom:6 }}>lastChatPayload → /api/chat</div>
              <pre style={{ margin:0, fontSize:12, overflowX:'auto' }}>{pretty(lastChatPayload)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ---- Chat UI (original design) ---- */}
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
                    buyUrl={uiOffer.buyUrl || HM_LINK}
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
    </>
  );
}
