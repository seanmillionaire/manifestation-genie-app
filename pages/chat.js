// /pages/chat.js — Rx → (overlay) → Chat (intro bubbles → Ex1 → Ex2 numerology)
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { get, set, newId, pushThread, toPlainMessages } from '../src/flowState';
import { supabase } from '../src/supabaseClient';
import PrescriptionCard from "../components/ChatGenie/PrescriptionCard";
import TweakChips from "../components/Confirm/TweakChips";
import SoftConfirmBar from "../components/Confirm/SoftConfirmBar";
import { parseAnswers, scoreConfidence, variantFromScore } from "../src/features/confirm/decision";
import { prescribe } from "../src/engine/prescribe";
import { detectBeliefFrom, recommendProduct } from "../src/engine/recommendProduct";
import { ensureFirstName } from '../src/userName';
/* ----------------------------- tiny helpers ----------------------------- */

function escapeHTML(s=''){return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function nl2br(s=''){ return s.replace(/\n/g, '<br/>'); }
function pretty(o){ try { return JSON.stringify(o, null, 2); } catch { return String(o); } }
function firstWord(v){ return v ? String(v).trim().split(/\s+/)[0] : ''; }
function pickFirstName(src){
  const c = [src?.first_name, src?.firstName, src?.display_name, src?.displayName, src?.name, src?.full_name, src?.fullName]
    .map(firstWord).filter(Boolean);
  for (const t0 of c){
    const t = (t0||'').trim();
    if (!t || t.toLowerCase()==='friend' || /[0-9_@]/.test(t)) continue;
    return t[0].toUpperCase() + t.slice(1);
  }
  return '';
}

// light daily gating (HM card)
const HM_LINK = "https://hypnoticmeditations.ai/b/l0kmb";
function todayKey(){ return new Date().toISOString().slice(0,10); }
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
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mg_offer_shown_session', '1');
      localStorage.setItem('mg_offer_day', todayKey());
    }
  } catch {}
}

async function saveProgressToProfile({ supabase, step, details }) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    await supabase
      .from('user_progress')
      .upsert({
        user_id: user.id,
        day_key: new Date().toISOString().slice(0,10),
        step,
        details,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,day_key' });
  } catch {}
}

async function markWizardDoneToday(){
  try { localStorage.setItem('mg_wizard_day', todayKey()); } catch {}
  await saveProgressToProfile({
    supabase,
    step: 'wizard_done',
    details: { at: new Date().toISOString() }
  });
}

/* ------------------------ confetti (client-only) ------------------------ */
let _confetti = null; // will be set by dynamic import

async function bigConfettiShow(){
  try {
    if (!_confetti) return;
    const end = Date.now() + 1500;
    const colors = ['#FFD600', '#22c55e', '#60a5fa', '#f472b6', '#fbbf24', '#34d399'];

    (function frame(){
      _confetti({ particleCount: 8, angle: 60, spread: 70, origin: { x: 0 }, colors });
      _confetti({ particleCount: 8, angle: 120, spread: 70, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();

    // three beefy bursts
    for (let i=0;i<3;i++){
      _confetti({ particleCount: 180, startVelocity: 52, spread: 360, ticks: 140, scalar: 1.1, origin: { y: 0.55 }});
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r=>setTimeout(r, 180));
    }
  } catch {}
}

/* ------------------------------ component ------------------------------ */

export default function ChatPage(){
  const router = useRouter();
  const [S, setS] = useState(get());
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [uiOffer, setUiOffer] = useState(null);
  const [debugOn, setDebugOn] = useState(false);
  const [lastChatPayload, setLastChatPayload] = useState(null);
  const listRef = useRef(null);

  // UI stages: 'confirm' (soft bar only) → 'rx' → 'chat'
  const [stage, setStage] = useState('confirm');

  // chat phases:
  // 'intro' (three staggered bubbles with CTA) →
  // 'exercise1' (2-min reset, waits for "done") →
  // 'exercise2_dob' (asks DOB) →
  // 'exercise2_work' (numerology analysis) →
  // 'free'
  const [phase, setPhase] = useState('free');

  // overlay (launch chat)
  const [overlayVisible, setOverlayVisible] = useState(false);

  // soft confirm (before chat)
  const [confirmVariant, setConfirmVariant] = useState(null);
  const [parsed, setParsed] = useState({ outcome: null, block: null, state: null });
  const [firstRx, setFirstRx] = useState(null);
  const [showTweaks, setShowTweaks] = useState(false);

  // dopamine UI
  const [pointsBurst, setPointsBurst] = useState(0);
  const [showReadyCTA, setShowReadyCTA] = useState(false);

  // dynamic-confetti
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const m = await import('canvas-confetti');
        if (alive) _confetti = m.default || m;
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  // boot + name hydrate
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
          const { data: p } = await supabase.from('profiles')
            .select('first_name, full_name').eq('id', user.id).maybeSingle();
          const { data: up } = await supabase.from('user_profile')
            .select('first_name, full_name').eq('user_id', user.id).maybeSingle();
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
      setS(get());
    })();
  }, [router]);

  // derive confirm variant (used by SoftConfirmBar before chat)
  useEffect(() => {
    try {
      const a = { goal: S?.currentWish?.wish || S?.prompt_spec?.prompt || null, blocker: S?.currentWish?.block || null };
      const p = parseAnswers(a);
      setParsed(p);
      const score = scoreConfidence(p);
      setConfirmVariant(variantFromScore(score));
    } catch {}
  }, [S?.currentWish, S?.prompt_spec]);

  // keep scroll pinned during chat
  useEffect(() => {
    const el = listRef.current;
    if (el && stage === 'chat') el.scrollTop = el.scrollHeight;
  }, [S.thread, uiOffer, stage, showReadyCTA, pointsBurst]);

  // backend call
  async function callGenie({ text, systemHint=null }) {
    const stateNow = get();
    const payload = {
      userName: stateNow.firstName || null,
      context: {
        wish: stateNow.currentWish?.wish || null,
        block: stateNow.currentWish?.block || null,
        micro: stateNow.currentWish?.micro || null,
        vibe: stateNow.vibe || null,
        prompt_spec: stateNow.prompt_spec?.prompt || null,
        systemHint, // <- optional steering for exercise 2
      },
      messages: toPlainMessages(stateNow.thread || []),
      text
    };
    setLastChatPayload(payload);

    const resp = await fetch('/api/chat', {
      method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error('Genie API error');
    const data = await resp.json();
    return data?.reply || 'I’m here.';
  }

  /* -------------------------- scripted helpers -------------------------- */

  function pushBubble(line){ pushThread({ role:'assistant', content: line }); setS(get()); }

  function autoIntroSequence(){
    const st = get();
    const fn = st.firstName || 'Friend';
    const wish  = st.currentWish?.wish  || 'your goal';
    const block = st.currentWish?.block || 'what gets in the way';
    const micro = st.currentWish?.micro || null;

    // 1) greet
    pushBubble(`Hey ${fn} — great to see you here.`);
    // 2) one-line recap
    setTimeout(() => {
      const recap = `I see your goal is “${wish}”, the snag is “${block}”, and your next tiny step is ${micro ? `“${micro}”` : 'something we’ll set now'}.`;
      pushBubble(recap);
    }, 700);
    // 3) CTA bubble + button
    setTimeout(() => {
      pushBubble(`Ready to start manifesting?`);
      setShowReadyCTA(true);
    }, 1300);
  }

  function startExercise1(){
    setShowReadyCTA(false);
    setPhase('exercise1');
    const st = get();
    const goal = st.currentWish?.wish || 'your goal';
    const msg = [
      `Great — let’s get you a quick win now.`,
      ``,
      `🧠 2-Min Focus Reset`,
      `1) Sit tall. Close your eyes.`,
      `2) Inhale for 4… hold 2… exhale for 6. Do 6 breaths.`,
      `3) On each exhale, picture taking the tiniest step toward “${goal}”.`,
      ``,
      `Type **done** when you finish.`
    ].join('\n');
    pushBubble(msg);
  }

  async function awardPoints(amount = 50){
    setPointsBurst(p => p + amount);
    try {
      const cur = parseInt(localStorage.getItem('mg_points') || '0', 10);
      localStorage.setItem('mg_points', String(cur + amount));
    } catch {}
    await saveProgressToProfile({ supabase, step: 'win_points', details: { amount, at: new Date().toISOString() } });
    setTimeout(() => setPointsBurst(0), 1600);
  }

  async function finishExercise1ThenStart2(){
    await saveProgressToProfile({ supabase, step: 'exercise_done', details: { when: new Date().toISOString() } });
    bigConfettiShow();
    awardPoints(50);

    pushBubble(`✨ Nice work. That small win wires momentum.`);
    setTimeout(() => {
      pushBubble(`Let’s do one more quick alignment to lock this in.`);
    }, 600);

    // move to exercise 2 (ask DOB)
    setTimeout(() => {
      setPhase('exercise2_dob');
      pushBubble(`Tell me your date of birth (MM/DD/YYYY). I’ll map the numerology to “${get().currentWish?.wish || 'your goal'}” and give you 3 aligned moves.`);
    }, 1200);
  }

  function isDOB(s=''){
    return /\b(0?[1-9]|1[0-2])[\/\-\.](0?[1-9]|[12][0-9]|3[01])[\/\-\.](19|20)\d{2}\b/.test(s.trim());
  }

  async function runExercise2WithDOB(dob){
    setPhase('exercise2_work');
    // steer Genie with a system hint — your /api/chat should consider this key if present
    const wish = get().currentWish?.wish || 'my goal';
    const systemHint =
`You are a supportive manifestation coach. Use basic numerology with DOB: ${dob}.
Context user's primary goal: "${wish}".
1) Derive life path or core numerology quickly (no long tables).
2) Explain 1-2 relevant traits in plain language (2-3 sentences).
3) Give exactly 3 specific, doable actions for the next 24 hours, aligned to goal + numerology.
Keep it upbeat, concise, and practical.`;

    const reply = await callGenie({ text: 'Please analyze and advise.', systemHint });
    pushBubble(reply);

    // close day + bonus pop
    await saveProgressToProfile({ supabase, step: 'exercise2_done', details: { dob, at: new Date().toISOString() } });
    awardPoints(75);
    bigConfettiShow();

    // daily wrap
    setTimeout(() => {
      pushBubble(`That’s a strong finish for today. Come back tomorrow for your next dose — or chat freely with me now.`);
      setPhase('free');
    }, 600);
  }

  /* ---------------------------- send handler ---------------------------- */

  async function send(){
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    setThinking(true);

    pushThread({ role:'user', content: text });
    setS(get());

    try {
      if (phase === 'exercise1') {
        if (/^done\b/i.test(text)) {
          await finishExercise1ThenStart2();
          setThinking(false);
          return;
        } else {
          pushBubble(`No rush. Do the 2-min reset, then type **done** when finished.`);
          setThinking(false);
          return;
        }
      }

      if (phase === 'exercise2_dob') {
        if (isDOB(text)) {
          await runExercise2WithDOB(text);
          setThinking(false);
          return;
        } else {
          pushBubble(`Got it. Please send DOB like **MM/DD/YYYY** (e.g., 08/14/1990).`);
          setThinking(false);
          return;
        }
      }

      // FREE CHAT
      const combined = S?.prompt_spec?.prompt ? `${S.prompt_spec.prompt}\n\nUser: ${text}` : text;

      try {
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
          markOfferShown();
        }
      } catch {}

      const reply = await callGenie({ text: combined });
      pushBubble(reply);
    } catch {
      pushBubble('The lamp flickered. Try again in a moment.');
    } finally {
      setThinking(false);
    }
  }

  function onKey(e){
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  /* -------------------------- staged handlers --------------------------- */

  function onLooksRight() {
    const plan = prescribe(parsed || {});
    setFirstRx(plan);
    setStage('rx');
    setTimeout(() => {
      const el = document.getElementById("first-prescription");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }
  function onTweak() { setShowTweaks(true); }
  function onApplyTweaks(next){
    setParsed({
      outcome: next.outcome || parsed.outcome,
      block: next.block || parsed.block,
      state: (next.state ?? parsed.state) || null
    });
    setShowTweaks(false);
    onLooksRight();
  }

  // overlay tap → enter chat (intro bubbles with pacing)
  async function dismissOverlay(){
    set({ thread: [] }); // fresh thread
    await markWizardDoneToday();

    setStage('chat');
    setOverlayVisible(false);

    // run the three intro bubbles with delays, then show CTA
    setPhase('intro');
    autoIntroSequence();

    setTimeout(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 1600);
  }

  /* ------------------------------- styles ------------------------------- */
  const overlayStyles = `
@keyframes popIn { 0% { transform: scale(.7); opacity: 0 } 60% { transform: scale(1.08); opacity:1 } 100% { transform: scale(1) } }
@keyframes floaty { 0% { transform: translateY(0) } 50% { transform: translateY(-6px) } 100% { transform: translateY(0) } }
@keyframes pointsPop {
  0% { transform: translate(-50%, 10px) scale(.9); opacity: 0 }
  20% { opacity: 1 }
  60% { transform: translate(-50%, -22px) scale(1.04); opacity: 1 }
  100% { transform: translate(-50%, -44px) scale(1); opacity: 0 }
}
`;

  /* -------------------------------- UI --------------------------------- */
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: overlayStyles}} />

      {/* Debug pill */}
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
              <pre style={{ margin:0, fontSize:12, overflowX:'auto' }}>
                {pretty(lastChatPayload ?? { info: "No chat call yet. Send a message to populate lastChatPayload." })}
              </pre>
            </div>
            <div style={{ gridColumn:'1 / span 2', background:'#0f172a', padding:10, borderRadius:8 }}>
              <div style={{ fontSize:12, opacity:.8, marginBottom:6 }}>softConfirm</div>
              <pre style={{ margin:0, fontSize:12, whiteSpace:'pre-wrap' }}>
                {pretty({ parsed, confirmVariant, firstRx, stage, overlayVisible, phase })}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ---- Main Card ---- */}
      <div style={{ maxWidth: 980, margin: '12px auto', padding: '0 10px', position:'relative' }}>
        {/* points burst */}
        {pointsBurst > 0 && (
          <div style={{
            position:'fixed', left:'50%', bottom: 96,
            transform:'translateX(-50%)', pointerEvents:'none',
            background:'rgba(255,214,0,0.95)', border:'1px solid rgba(0,0,0,0.12)',
            borderRadius:999, padding:'10px 16px', fontWeight:900,
            animation:'pointsPop 1.3s ease-out both', zIndex:60
          }}>
            +{pointsBurst}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:10 }}>
          <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:16, padding:10 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <div style={{ fontWeight:900, fontSize:18 }}>Genie Chat</div>
            </div>

            {/* Stage: confirm card appears BEFORE chat */}
            {stage === 'confirm' && (
              <>
                {showTweaks && (
                  <div style={{ marginBottom: 8 }}>
                    <TweakChips
                      outcome={parsed?.outcome || ""}
                      block={parsed?.block || ""}
                      stateGuess={parsed?.state || null}
                      onApply={onApplyTweaks}
                      onClose={()=>setShowTweaks(false)}
                    />
                  </div>
                )}
                <div style={{ marginBottom: 8 }}>
                  <SoftConfirmBar
                    outcome={parsed?.outcome}
                    block={parsed?.block}
                    variant={confirmVariant}
                    onLooksRight={onLooksRight}
                    onTweak={onTweak}
                  />
                </div>
              </>
            )}

            {/* Stage: rx (prescription; button opens overlay to enter chat) */}
            {stage === 'rx' && firstRx && (
              <div id="first-prescription" style={{ marginBottom: 8 }}>
                <PrescriptionCard
                  title={firstRx.firstMeditation}
                  why={`Fastest unlock for your path (${firstRx.family} • ${firstRx.protocol}). Use once tonight. Return for next dose.`}
                  onClose={() => setFirstRx(null)}
                  ctaLabel="Listen To This »"
                  onCta={() => {
                    window.open(HM_LINK, "_blank", "noopener,noreferrer");
                    setOverlayVisible(true);
                    setTimeout(() => {
                      const ov = document.getElementById("genie-overlay-tap");
                      if (ov) ov.focus();
                    }, 100);
                  }}
                />
              </div>
            )}

            {/* Stage: chat */}
            {stage === 'chat' && (
              <>
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
                      {/* reuse the card for offers */}
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

                {/* “Yes, I’m ready” CTA (shown at end of intro sequence) */}
                {showReadyCTA && (
                  <div style={{ marginTop: 10, textAlign:'center' }}>
                    <button
                      onClick={startExercise1}
                      style={{
                        appearance:'none',
                        padding:'12px 18px',
                        fontWeight:900,
                        border:0,
                        borderRadius:12,
                        background:'#111',
                        color:'#ffd600',
                        cursor:'pointer',
                        boxShadow:'0 8px 24px rgba(0,0,0,.18)'
                      }}
                    >
                      Yes, I’m ready
                    </button>
                  </div>
                )}

                {/* input row */}
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
                      fontWeight:900,
                      cursor:'pointer'
                    }}
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Overlay that launches the chat */}
      {overlayVisible && (
        <div
          onClick={dismissOverlay}
          role="button"
          id="genie-overlay-tap"
          tabIndex={0}
          title="Tap to meet your Genie"
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.55)',
            display:'flex', alignItems:'center', justifyContent:'center',
            zIndex: 50, cursor:'pointer'
          }}
        >
          <div
            style={{
              width: 360, maxWidth:'88%',
              background:'#fff',
              borderRadius:16,
              padding:'18px 16px',
              textAlign:'center',
              border:'1px solid rgba(0,0,0,0.08)',
              animation: 'popIn .28s ease-out'
            }}
          >
            <div style={{ fontSize:40, lineHeight:1, animation:'floaty 2.2s ease-in-out infinite' }}>🧞‍♂️</div>
            <div style={{ fontWeight:900, marginTop:8, fontSize:18 }}>The Genie is waiting for you…</div>
            <div style={{ marginTop:6, fontSize:13, color:'#334155' }}>Tap anywhere to begin your conversation.</div>
            <div style={{ marginTop:12 }}>
              <span style={{
                display:'inline-block',
                padding:'10px 14px',
                background:'#ffd600',
                borderRadius:12,
                fontWeight:900
              }}>Tap to enter</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
