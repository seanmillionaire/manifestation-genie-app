// /pages/chat.js — staged flow: Rx → (overlay) → Chat (no confirm round 2)
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { get, set, newId, pushThread, toPlainMessages } from '../src/flowState';
import { supabase } from '../src/supabaseClient';
import PrescriptionCard from "../components/ChatGenie/PrescriptionCard";
import { detectBeliefFrom, recommendProduct } from "../src/engine/recommendProduct";
import TweakChips from "../components/Confirm/TweakChips";
import SoftConfirmBar from "../components/Confirm/SoftConfirmBar";
import { parseAnswers, scoreConfidence, variantFromScore } from "../src/features/confirm/decision";
import { prescribe } from "../src/engine/prescribe";

// Safe, client-only confetti loader
let _confetti = null;

function fireConfettiBurst() {
  try {
    if (!_confetti || typeof window === 'undefined') return;

    const duration = 1500;
    const end = Date.now() + duration;

    (function frame() {
      _confetti({
        particleCount: 18,
        startVelocity: 36,
        spread: 360,
        gravity: 0.9,
        ticks: 180,
        scalar: 1.1,
        origin: { x: Math.random(), y: Math.random() * 0.2 + 0.1 }
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  } catch {}
}

/* ----------------------- helpers (pure / top-level) ----------------------- */

// Loose “yes” detector (kept for completeness; not used in initial flow now)
function isYesLoose(raw = '') {
  const s = raw.trim().toLowerCase();
  if (!s) return false;
  const t = s.replace(/[.!?…\s]+$/g, '');
  const DIRECT = [
    'yes','y','yep','yeah','ok','okay','sure','ready','looks good','yes sir','ypu','yup',
    'looks right','correct',"that's right",'sounds right','let’s go',"let's go"
  ];
  if (DIRECT.includes(t)) return true;
  if (/^y(es)+\b/.test(t) || /\bok(ay)?\b/.test(t)) return true;
  if (/\b(start|begin|go|proceed|continue|ready)\b/.test(t)) return true;
  if (/\b(you know already|same|no change)\b/.test(t)) return true;
  return false;
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

// Parse "Goal: xxx | Block: yyy" (order free; partials allowed)
function parseInlineUpdate(text, stateNow) {
  if (!text) return null;
  if (/^\s*(you know already|same|no change)\s*$/i.test(text)) {
    return { ...stateNow.currentWish };
  }
  const goalMatch  = /goal\s*[:=\-]\s*([^|]+?)(?=$|\|)/i.exec(text);
  const blockMatch = /block(?:er)?\s*[:=\-]\s*([^|]+?)(?=$|\|)/i.exec(text);
  const microMatch = /micro\s*[:=\-]\s*([^|]+?)(?=$|\|)/i.exec(text);

  if (!goalMatch && !blockMatch && !microMatch) {
    const g2 = /(?:^|\s)goal\s+is\s+(.+)/i.exec(text);
    const b2 = /(?:^|\s)block(?:er)?\s+is\s+(.+)/i.exec(text);
    const m2 = /(?:^|\s)micro\s+is\s+(.+)/i.exec(text);
    if (!g2 && !b2 && !m2) return null;
    return {
      ...stateNow.currentWish,
      wish:  g2 ? g2[1].trim() : (stateNow.currentWish?.wish || null),
      block: b2 ? b2[1].trim() : (stateNow.currentWish?.block || null),
      micro: m2 ? m2[1].trim() : (stateNow.currentWish?.micro || null),
    };
  }
  return {
    ...stateNow.currentWish,
    wish:  goalMatch  ? goalMatch[1].trim()  : (stateNow.currentWish?.wish || null),
    block: blockMatch ? blockMatch[1].trim() : (stateNow.currentWish?.block || null),
    micro: microMatch ? microMatch[1].trim() : (stateNow.currentWish?.micro || null),
  };
}

// tiny utils
function escapeHTML(s=''){return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function nl2br(s=''){ return s.replace(/\n/g, '<br/>'); }
function pretty(o){ try { return JSON.stringify(o, null, 2); } catch { return String(o); } }
function pickFirstName(src){
  const first = (v)=> v ? String(v).trim().split(/\s+/)[0] : '';
  const cands = [src?.first_name, src?.firstName, src?.display_name, src?.displayName, src?.name, src?.full_name, src?.fullName]
    .map(first).filter(Boolean);
  for (const c of cands){
    const t = c.trim();
    if (!t) continue;
    if (t.toLowerCase() === 'friend') continue;
    if (/[0-9_@]/.test(t)) continue;
    return t[0].toUpperCase() + t.slice(1);
  }
  return '';
}

// offer gating
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
  try { if (typeof window !== 'undefined') {
    sessionStorage.setItem('mg_offer_shown_session', '1');
    localStorage.setItem('mg_offer_day', todayKey());
  }} catch {}
}
async function markWizardDoneToday(){
  try { localStorage.setItem('mg_wizard_day', todayKey()); } catch {}
  await saveProgressToProfile({
    supabase,
    step: 'wizard_done',
    details: { at: new Date().toISOString() }
  });
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
  const confirmNudgesRef = useRef(0); // kept for free chat edge cases

  // UI: 'confirm' (kept only for soft bar) → 'rx' → 'chat'
  const [stage, setStage] = useState('confirm');

  // chatScriptPhase: now goes 'exercise' → 'win' → 'free'
  const [chatScriptPhase, setChatScriptPhase] = useState('free');

  // overlay separate from stage; covers current stage
  const [overlayVisible, setOverlayVisible] = useState(false);

  // soft-confirm state
  const [confirmVariant, setConfirmVariant] = useState(null);
  const [parsed, setParsed] = useState({ outcome: null, block: null, state: null });
  const [firstRx, setFirstRx] = useState(null);
  const [showTweaks, setShowTweaks] = useState(false);

  // dopamine UI
  const [pointsBurst, setPointsBurst] = useState(0);
  const [showWinCTA, setShowWinCTA] = useState(false);

  // recap message (inside component so it can call setS)
  function pushHumanRecap() {
    const st = get();
    const fn = st.firstName || 'Friend';
    const wish  = st.currentWish?.wish  || 'your goal';
    const block = st.currentWish?.block || 'what gets in the way';
    const micro = st.currentWish?.micro || null;

    const line = `Hey ${fn} — I’m with you. Your goal is “${wish}”, ` +
      `the snag is “${block}”, and your next tiny step is ${micro ? `“${micro}”` : 'set together now'}.`;
    pushThread({ role:'assistant', content: line });
    setS(get());
  }
  function pushLetsStart(fn='Friend'){
    pushThread({ role:'assistant', content: `Alright ${fn}, let’s get started on manifesting this.` });
    setS(get());
  }
  function pushFirstExercise(){
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
    pushThread({ role:'assistant', content: msg });
    setS(get());
  }

  async function heavyConfetti(){
    try {
      const confetti = (await import('canvas-confetti')).default;
      const end = Date.now() + 1000;
      const colors = ['#FFD600', '#22c55e', '#60a5fa', '#f472b6', '#fbbf24', '#34d399'];

      (function frame(){
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 75,
          origin: { x: 0 },
          colors
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 75,
          origin: { x: 1 },
          colors
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();

      // three big bursts
      for (let i=0;i<3;i++){
        confetti({
          particleCount: 180,
          startVelocity: 45,
          spread: 360,
          ticks: 120,
          origin: { y: 0.6 }
        });
        // small pause
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r=>setTimeout(r, 180));
      }
    } catch {}
  }

  async function awardPoints(amount = 50){
    setPointsBurst(p => p + amount);
    try {
      const cur = parseInt(localStorage.getItem('mg_points') || '0', 10);
      localStorage.setItem('mg_points', String(cur + amount));
    } catch {}
    await saveProgressToProfile({
      supabase,
      step: 'win_points',
      details: { amount, at: new Date().toISOString() }
    });
    setTimeout(() => setPointsBurst(0), 1600);
  }

  async function finishExerciseAndWrap(){
    await saveProgressToProfile({
      supabase,
      step: 'exercise_done',
      details: { when: new Date().toISOString() }
    });

    // Dopamine: confetti + points
    heavyConfetti();
    awardPoints(50);

    const msg = [
      `✨ Nice work. That small win wires momentum.`,
      ``,
      `You can come back tomorrow for your next dose…`,
      `or tap the button below if you wish to go further.`
    ].join('\n');
fireConfettiBurst();

    pushThread({ role:'assistant', content: msg });
    setS(get());
    setShowWinCTA(true);
  }

  function triggerExerciseOne(){
    // Hand off to your existing flow/exercise engine
    set({ phase: 'exercise1', exerciseSeed: Date.now() });
    router.push('/flow');
  }
// Lazy-load confetti only on the client; never break SSR/builds
useEffect(() => {
  let alive = true;
  (async () => {
    try {
      const m = await import('canvas-confetti');
      if (alive) _confetti = m.default || m;
    } catch {
      // no-op: confetti just won't fire if it can't load
    }
  })();
  return () => { alive = false; };
}, []);

  // auto-enable debug via ?debug=1
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      if (q.get('debug') === '1') setDebugOn(true);
    }
  }, []);

  // boot + greet + pull name (soft confirm happens BEFORE chat; chat skips it)
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
      setS(get());
    })();
  }, [router]);

  // derive confirm variant (still used by SoftConfirmBar before chat)
  useEffect(() => {
    try {
      const a = {
        goal: S?.currentWish?.wish || S?.prompt_spec?.prompt || null,
        blocker: S?.currentWish?.block || null
      };
      const p = parseAnswers(a);
      const score = scoreConfidence(p);
      setParsed(p);
      setConfirmVariant(variantFromScore(score));
    } catch {}
  }, [S?.currentWish, S?.prompt_spec]);

  // keep scroll pinned once chat is visible
  useEffect(() => {
    const el = listRef.current;
    if (el && stage === 'chat') el.scrollTop = el.scrollHeight;
  }, [S.thread, uiOffer, stage, showWinCTA]);

  // central API to your backend
  async function callGenie({ text }) {
    const stateNow = get();
    const payload = {
      userName: stateNow.firstName || null,
      context: {
        wish: stateNow.currentWish?.wish || null,
        block: stateNow.currentWish?.block || null,
        micro: stateNow.currentWish?.micro || null,
        vibe: stateNow.vibe || null,
        prompt_spec: stateNow.prompt_spec?.prompt || null,
      },
      messages: toPlainMessages(stateNow.thread || []),
      text
    };
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

  // send handler (now main scripted path is exercise → done)
  async function send(){
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    setThinking(true);

    pushThread({ role:'user', content: text });
    setS(get());

    try {
      // ----- PHASE: exercise -----
      if (chatScriptPhase === 'exercise') {
        if (/^done\b/i.test(text)) {
          setChatScriptPhase('win');
          await finishExerciseAndWrap();
          setChatScriptPhase('free');
          return;
        } else {
          pushThread({
            role:'assistant',
            content: `No rush. Do the 2-min reset, then type **done** when finished.`
          });
          setS(get());
          return;
        }
      }

      // ----- FREE CHAT -----
      const combined = S?.prompt_spec?.prompt
        ? `${S.prompt_spec.prompt}\n\nUser: ${text}`
        : text;

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

  // -------- staged handlers --------
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

  // overlay tap → enter chat (now: greet → short line → exercise, with pacing)
  async function dismissOverlay(){
    // reset any old thread so we don't load a previous convo
    set({ thread: [] });

    // stamp wizard done for today
    markWizardDoneToday();

    // flip UI to chat now
    setStage('chat');
    setOverlayVisible(false);

    // set phase to exercise immediately (no confirm round 2)
    setChatScriptPhase('exercise');

    // staggered intro messages
    const fn = get().firstName || 'Friend';
    pushHumanRecap();
    setTimeout(() => { pushLetsStart(fn); }, 700);
    setTimeout(() => { pushFirstExercise(); }, 1500);

    setTimeout(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 1600);
  }

  // overlay styles + points pop
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

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: overlayStyles}} />

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
              <pre style={{ margin:0, fontSize:12, overflowX:'auto' }}>
                {pretty(lastChatPayload ?? { info: "No chat call yet. Send a message to populate lastChatPayload." })}
              </pre>
            </div>

            <div style={{ gridColumn:'1 / span 2', background:'#0f172a', padding:10, borderRadius:8 }}>
              <div style={{ fontSize:12, opacity:.8, marginBottom:6 }}>softConfirm</div>
              <pre style={{ margin:0, fontSize:12, whiteSpace:'pre-wrap' }}>
                {pretty({ parsed, confirmVariant, firstRx, stage, overlayVisible, chatScriptPhase })}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ---- Main Card (staged) ---- */}
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

            {/* Stage: confirm card still appears BEFORE chat, unchanged */}
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

            {/* Stage: rx (prescription only; the card button opens overlay) */}
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

                {/* Win CTA (appears after "done") */}
                {showWinCTA && (
                  <div style={{ marginTop: 10, textAlign:'center' }}>
                    <button
                      onClick={triggerExerciseOne}
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
                      LET’S GO!
                    </button>
                  </div>
                )}

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

      {/* Emoji overlay — shows above current stage; tap to continue */}
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
