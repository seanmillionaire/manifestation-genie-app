// /pages/chat.js — staged flow: Rx → (overlay) → Chat
// Greeting → Recap → “Yes, I’m ready” button → 2-min reset → user types “done” → fast confetti + points
// → Date-of-Birth Numerology Exercise → “Did that make sense?” (Yes/No)

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

// ---------------- client-only confetti (safe on SSR) ----------------
let _confetti = null;
useConfettiLazyLoad();

// Faster, snappier confetti (shorter lifetime, clears quickly)
function fireConfettiSnappy() {
  try {
    if (!_confetti || typeof window === 'undefined') return;

    // brief 650ms stream + 2 punchy bursts
    const end = Date.now() + 650;

    (function frame() {
      _confetti({
        particleCount: 10,
        startVelocity: 40,
        spread: 70,
        gravity: 1.2,
        ticks: 80,         // shorter life → clears quicker
        scalar: 0.9,
        origin: { x: Math.random(), y: Math.random() * 0.2 + 0.1 }
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();

    // two quick big pops
    for (let i = 0; i < 2; i++) {
      _confetti({
        particleCount: 90,
        startVelocity: 52,
        spread: 360,
        ticks: 75,        // fade fast
        origin: { y: 0.55 }
      });
    }
  } catch {}
}

function useConfettiLazyLoad(){
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
}

// ---------------- tiny utils ----------------
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

// offer gating (unchanged)
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

// ---------------- Numerology helpers ----------------
function reduceToDigit(n){
  // reduce to 1 digit, but keep master 11/22/33
  const s = String(n).replace(/\D/g,'');
  let sum = 0;
  for (const ch of s) sum += (ch.charCodeAt(0) - 48);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33){
    let t = 0;
    for (const ch of String(sum)) t += (ch.charCodeAt(0) - 48);
    sum = t;
  }
  return sum;
}
function lifePathFromDOB(dobStr){
  // expects YYYY-MM-DD or MM/DD/YYYY or DD-MM-YYYY etc. Try to parse flexibly.
  if (!dobStr) return null;
  const clean = dobStr.replace(/[^\d]/g,'');
  // heuristics
  let y, m, d;
  if (clean.length === 8){
    // try YYYYMMDD first
    const y1 = parseInt(clean.slice(0,4),10);
    const m1 = parseInt(clean.slice(4,6),10);
    const d1 = parseInt(clean.slice(6,8),10);
    if (m1>=1 && m1<=12 && d1>=1 && d1<=31) { y=y1;m=m1;d=d1; }
    else {
      // try MMDDYYYY
      const m2 = parseInt(clean.slice(0,2),10);
      const d2 = parseInt(clean.slice(2,4),10);
      const y2 = parseInt(clean.slice(4,8),10);
      if (m2>=1 && m2<=12 && d2>=1 && d2<=31) { y=y2;m=m2;d=d2; }
    }
  }
  if (!y || !m || !d) return null;
  const total = reduceToDigit(y) + reduceToDigit(m) + reduceToDigit(d);
  const path = reduceToDigit(total);
  return { y, m, d, lifePath: path };
}
function humanLifePathMeaning(n){
  // very short, friendly blurbs (feel free to expand later)
  const map = {
    1: "Leader vibes — bold, independent, start-energy.",
    2: "Connector — intuitive, collaborative, harmony-seeker.",
    3: "Creator — expressive, magnetic, talk-it-into-existence.",
    4: "Builder — systems, discipline, compound wins.",
    5: "Explorer — change, freedom, momentum junkie.",
    6: "Nurturer — heart-led, responsibility, home base.",
    7: "Seeker — depth, wisdom, inner clarity.",
    8: "Powerhouse — wealth channel, scale, authority.",
    9: "Humanitarian — purpose, compassion, big arc.",
    11: "Master Intuition — visionary antenna up.",
    22: "Master Builder — dream → blueprint → real.",
    33: "Master Healer — unconditional love engine."
  };
  return map[n] || "A unique pattern that wants consistent attention.";
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

  // UI stages: 'confirm' (soft bar) → 'rx' → 'chat'
  const [stage, setStage] = useState('confirm');

  // chat script phases: 'readyGate' → 'exercise' → 'postWin' → 'numerologyAskDOB' → 'numerologyShow' → 'free'
  const [chatScriptPhase, setChatScriptPhase] = useState('free');

  // overlay covers current stage
  const [overlayVisible, setOverlayVisible] = useState(false);

  // soft-confirm state (pre-chat)
  const [confirmVariant, setConfirmVariant] = useState(null);
  const [parsed, setParsed] = useState({ outcome: null, block: null, state: null });
  const [firstRx, setFirstRx] = useState(null);
  const [showTweaks, setShowTweaks] = useState(false);

  // dopamine UI
  const [pointsBurst, setPointsBurst] = useState(0);

  // “Yes, I’m ready” gate
  const [showReadyCTA, setShowReadyCTA] = useState(false);

  // numerology subflow
  const [numerology, setNumerology] = useState({ dob: '', lifePath: null });
  const [awaitingDOB, setAwaitingDOB] = useState(false);
  const [awaitingComprehension, setAwaitingComprehension] = useState(false);

  // recap → human style
  function pushHumanGreeting(){
    const fn = get().firstName || 'Friend';
    pushThread({ role:'assistant', content: `hey ${fn} — great to see you here 👋` });
    setS(get());
  }
  function pushHumanRecap(){
    const st = get();
    const fn = st.firstName || 'Friend';
    const wish  = st.currentWish?.wish  || 'your goal';
    const block = st.currentWish?.block || 'what gets in the way';
    const micro = st.currentWish?.micro || null;

    const line = `I’m hearing your goal is “${wish}” — and the main snag is “${block}”.` +
                 (micro ? ` Tiny next step you picked: “${micro}”.` : '');
    pushThread({ role:'assistant', content: line });
    setS(get());
  }
  function pushReadyCheck(){
    pushThread({ role:'assistant', content: `Ready to get this moving? 💫` });
    setS(get());
    setShowReadyCTA(true);
  }

  function startFirstExercise(){
    const st = get();
    const goal = st.currentWish?.wish || 'your goal';
    const msg = [
      `Awesome — quick 2-min reset to lock in momentum.`,
      ``,
      `🧠 2-Min Focus Reset`,
      `1) Sit tall. Close your eyes.`,
      `2) Inhale for 4… hold 2… exhale for 6. Do 6 breaths.`,
      `3) On each exhale, picture the tiniest step toward “${goal}”.`,
      ``,
      `Type **done** when you finish.`
    ].join('\n');
    pushThread({ role:'assistant', content: msg });
    setS(get());
  }

  async function finishExerciseAndWrap(){
    await saveProgressToProfile({
      supabase,
      step: 'exercise_done',
      details: { when: new Date().toISOString() }
    });

    // points + fast confetti
    addPoints(50);
    fireConfettiSnappy();

    pushThread({
      role:'assistant',
      content: `✨ Beautiful. That’s a real win locked in.\n\nLet’s do one more quick thing together — it’s fun.`
    });
    setS(get());

    // move to numerology ask
    setChatScriptPhase('numerologyAskDOB');
    setTimeout(() => askDOB(), 650);
  }

  function addPoints(amount){
    setPointsBurst(p => p + amount);
    try {
      const cur = parseInt(localStorage.getItem('mg_points') || '0', 10);
      localStorage.setItem('mg_points', String(cur + amount));
    } catch {}
    saveProgressToProfile({
      supabase,
      step: 'win_points',
      details: { amount, at: new Date().toISOString() }
    });
    setTimeout(() => setPointsBurst(0), 1200);
  }

  function askDOB(){
    const fn = get().firstName || 'Friend';
    pushThread({ role:'assistant', content: `Quick Date-of-Birth Numerology for you, ${fn}. What’s your birthday? (MM/DD/YYYY)` });
    setS(get());
    setAwaitingDOB(true);
  }

  function showNumerology(dobStr){
    const info = lifePathFromDOB(dobStr);
    if (!info){
      pushThread({ role:'assistant', content: `Hmm, I couldn’t read that date. Try like **04/12/1992**.` });
      setS(get());
      setAwaitingDOB(true);
      return;
    }
    const meaning = humanLifePathMeaning(info.lifePath);
    setNumerology({ dob: dobStr, lifePath: info.lifePath });

    // Give info only (no question yet), then show buttons after a small pause
    const msg = [
      `Your Life Path number is **${info.lifePath}**.`,
      `${meaning}`,
      ``,
      `This is your baseline “tone” for how you move toward goals.`
    ].join('\n');
    pushThread({ role:'assistant', content: msg });
    setS(get());

    setChatScriptPhase('numerologyShow');
    setAwaitingDOB(false);

    // after a beat, ask if it made sense (with buttons)
    setTimeout(() => {
      pushThread({ role:'assistant', content: `Did that make sense?` });
      setS(get());
      setAwaitingComprehension(true);
    }, 900);
  }

  function simplifyNumerology(){
    const n = numerology.lifePath;
    const simple = `Your number is **${n}**. Think of it like your default gear.\n` +
      `• If it’s a **1** → you move best by deciding fast.\n` +
      `• **2** → you move best with a partner/support.\n` +
      `• **3** → you talk/brain-dump and then act.\n` +
      `• **4** → small daily blocks stack-up.\n` +
      `• **5** → change scenery, then act.\n` +
      `• **6** → tie it to caring for someone/yourself.\n` +
      `• **7** → get quiet for a minute first.\n` +
      `• **8** → pick the lever that scales.\n` +
      `• **9** → link it to purpose.\n` +
      `• **11/22/33** → trust your “ping” and build from it.`;
    pushThread({ role:'assistant', content: simple });
    setS(get());

    // placeholder end for now — you’ll extend here later
    setTimeout(() => {
      pushThread({ role:'assistant', content: `Got you. We’ll build on this next time. 🌙` });
      setS(get());
      setAwaitingComprehension(false);
      setChatScriptPhase('free');
    }, 900);
  }

  // -------- boot (name/profile), confirm bar, etc. --------
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

  // keep scroll pinned
  useEffect(() => {
    const el = listRef.current;
    if (el && stage === 'chat') el.scrollTop = el.scrollHeight;
  }, [S.thread, uiOffer, stage]);

  // central API
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

  // main send
  async function send(){
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    setThinking(true);

    pushThread({ role:'user', content: text });
    setS(get());

    try {
      // handle DOB capture
      if (awaitingDOB && chatScriptPhase === 'numerologyAskDOB') {
        showNumerology(text);
        setThinking(false);
        return;
      }

      // comprehension buttons handled via handlers below; but if user typed "yes/no" manually:
      if (awaitingComprehension && chatScriptPhase === 'numerologyShow') {
        const t = text.toLowerCase();
        if (/\by(es)?\b/.test(t)) {
          pushThread({ role:'assistant', content: `Perfect. We’ll stack onto this next session. 🌟` });
          setS(get());
          setAwaitingComprehension(false);
          setChatScriptPhase('free');
          setThinking(false);
          return;
        }
        if (/\bno\b/.test(t)) {
          simplifyNumerology();
          setThinking(false);
          return;
        }
      }

      // exercise “done”
      if (chatScriptPhase === 'exercise') {
        if (/^done\b/i.test(text)) {
          setChatScriptPhase('postWin');
          await finishExerciseAndWrap();
          setThinking(false);
          return;
        } else {
          pushThread({
            role:'assistant',
            content: `All good — take your 6 slow breaths and type **done** when you’re finished. 🧘‍♂️`
          });
          setS(get());
          setThinking(false);
          return;
        }
      }

      // free chat fallback
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  // staged handlers
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

  // CTA actions inside chat
  function onReadyClick(){
    setShowReadyCTA(false);
    setChatScriptPhase('exercise');
    setTimeout(() => startFirstExercise(), 300);
  }
  function onComprehensionYes(){
    // placeholder ending for now (per your note)
    pushThread({ role:'assistant', content: `Love it. We’ll pick up from here next time. 🔮` });
    setS(get());
    setAwaitingComprehension(false);
    setChatScriptPhase('free');
  }
  function onComprehensionNo(){
    simplifyNumerology();
  }

  // overlay tap → enter chat with paced messages & button
  async function dismissOverlay(){
    // fresh thread
    set({ thread: [] });

    // stamp wizard done for today
    markWizardDoneToday();

    // enter chat immediately
    setStage('chat');
    setOverlayVisible(false);

    // greet → recap → ready button (paced)
    setChatScriptPhase('readyGate');
    setTimeout(() => { pushHumanGreeting(); }, 200);
    setTimeout(() => { pushHumanRecap(); }, 900);
    setTimeout(() => { pushReadyCheck(); }, 1600);

    setTimeout(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 1800);
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
            animation:'pointsPop 1.1s ease-out both', zIndex:60
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

            {/* Stage: rx (prescription; button opens overlay) */}
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

                {/* Inline CTAs below the thread */}
                {showReadyCTA && chatScriptPhase === 'readyGate' && (
                  <div style={{ display:'flex', justifyContent:'center', marginTop:10 }}>
                    <button
                      onClick={onReadyClick}
                      style={{
                        appearance:'none',
                        padding:'10px 16px',
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

                {awaitingComprehension && chatScriptPhase === 'numerologyShow' && (
                  <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:10 }}>
                    <button
                      onClick={onComprehensionYes}
                      style={{
                        padding:'10px 16px', borderRadius:12, border:0,
                        background:'#22c55e', color:'#111', fontWeight:900, cursor:'pointer'
                      }}
                    >
                      Yes
                    </button>
                    <button
                      onClick={onComprehensionNo}
                      style={{
                        padding:'10px 16px', borderRadius:12, border:0,
                        background:'#fbbf24', color:'#111', fontWeight:900, cursor:'pointer'
                      }}
                    >
                      No
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
