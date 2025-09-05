// /pages/chat.js — SoftConfirm → Chat (intro → CTA → Exercise1 → DOB Numerology)
// RX is skipped entirely.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { get, set, newId, pushThread, toPlainMessages } from "../src/flowState";
import { supabase } from "../src/supabaseClient";
import TweakChips from "../components/Confirm/TweakChips";
import SoftConfirmBar from "../components/Confirm/SoftConfirmBar";
import { parseAnswers, scoreConfidence, variantFromScore } from "../src/features/confirm/decision";
import { detectBeliefFrom, recommendProduct } from "../src/engine/recommendProduct";
import { hydrateFirstNameFromSupabase } from "../src/userName";

/* tiny utils */
function escapeHTML(s=''){return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function nl2br(s=''){ return s.replace(/\n/g, "<br/>"); }
function pretty(o){ try { return JSON.stringify(o, null, 2); } catch { return String(o); } }

/* confetti (client-only; no localStorage/sessionStorage) */
let _confetti = null;
async function loadConfetti(){ try { const m = await import("canvas-confetti"); _confetti = m.default || m; } catch {} }
async function popConfetti() {
  try {
    if (!_confetti) return;
    const end = Date.now() + 800; // shorter tail so it doesn’t linger
    (function frame(){
      _confetti({ particleCount: 8, angle: 60, spread: 70, origin: { x: 0 }});
      _confetti({ particleCount: 8, angle: 120, spread: 70, origin: { x: 1 }});
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    _confetti({ particleCount: 120, startVelocity: 52, spread: 360, ticks: 100, scalar: 1.0, origin: { y: 0.6 }});
  } catch {}
}

/* component */
export default function ChatPage(){
  const router = useRouter();
  const [S, setS] = useState(get());
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [uiOffer, setUiOffer] = useState(null);
  const [debugOn, setDebugOn] = useState(false);
  const [lastChatPayload, setLastChatPayload] = useState(null);
  const listRef = useRef(null);

  // UI stages: 'confirm' → 'chat'   (RX removed)
  const [stage, setStage] = useState("confirm");

  // phases: 'intro' → 'exercise1' → 'dob' → 'work' → 'free'
  const [phase, setPhase] = useState("free");

  // soft-confirm state
  const [confirmVariant, setConfirmVariant] = useState(null);
  const [parsed, setParsed] = useState({ outcome: null, block: null, state: null });
  const [showTweaks, setShowTweaks] = useState(false);

  // dopamine UI
  const [pointsBurst, setPointsBurst] = useState(0);
  const [showReadyCTA, setShowReadyCTA] = useState(false);

  /* init */
  useEffect(() => { loadConfetti(); }, []);

  useEffect(() => {
    (async () => {
      const cur = get();
      // redirect to earlier steps if needed
      if (!cur.vibe) { router.replace("/vibe"); return; }
      // ensure name is hydrated from Supabase (no local storage)
      await hydrateFirstNameFromSupabase();
      setS(get());
    })();
  }, [router]);

  // derive confirm variant
  useEffect(() => {
    try {
      const a = { goal: S?.currentWish?.wish || S?.prompt_spec?.prompt || null, blocker: S?.currentWish?.block || null };
      const p = parseAnswers(a);
      setParsed(p);
      const score = scoreConfidence(p);
      setConfirmVariant(variantFromScore(score));
    } catch {}
  }, [S?.currentWish, S?.prompt_spec]);

  // keep scroll pinned
  useEffect(() => {
    const el = listRef.current;
    if (el && stage === "chat") el.scrollTop = el.scrollHeight;
  }, [S.thread, uiOffer, stage, showReadyCTA, pointsBurst]);

  // if chat opens empty for any reason, kick off intro deterministically
  useEffect(() => {
    if (stage !== "chat") return;
    const empty = !Array.isArray(S.thread) || S.thread.length === 0;
    if (empty && phase !== "intro") {
      setPhase("intro");
      setShowReadyCTA(false);
      autoIntroSequence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

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
        systemHint,
      },
      messages: toPlainMessages(stateNow.thread || []),
      text
    };
    setLastChatPayload(payload);

    const resp = await fetch("/api/chat", {
      method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error("Genie API error");
    const data = await resp.json();
    return data?.reply || "I’m here.";
  }

  function pushBubble(line){ pushThread({ role:"assistant", content: line }); setS(get()); }

  function autoIntroSequence(){
    const st = get();
    const fn = (st.firstName && st.firstName !== "Friend") ? st.firstName : "Friend";
    const wish  = st.currentWish?.wish  || "your goal";
    const block = st.currentWish?.block || "what gets in the way";
    const micro = st.currentWish?.micro || null;

    pushBubble(`Hey ${fn} — great to see you here.`);
    setTimeout(() => {
      const recap = `I see your goal is “${wish}”, the snag is “${block}”, and your next tiny step is ${micro ? `“${micro}”` : "something we’ll set now"}.`;
      pushBubble(recap);
    }, 700);
    setTimeout(() => {
      pushBubble(`Ready to start manifesting?`);
      setShowReadyCTA(true);
    }, 1300);
  }

  function startExercise1(){
    setShowReadyCTA(false);
    setPhase("exercise1");
    const st = get();
    const goal = st.currentWish?.wish || "your goal";
    const msg = [
      `Great — let’s get you a quick win now.`,
      ``,
      `🧠 2-Min Focus Reset`,
      `1) Sit tall. Close your eyes.`,
      `2) Inhale for 4… hold 2… exhale for 6. Do 6 breaths.`,
      `3) On each exhale, picture taking the tiniest step toward “${goal}”.`,
      ``,
      `Type **done** when you finish.`
    ].join("\n");
    pushBubble(msg);
  }

  async function awardPoints(amount = 50){
    setPointsBurst(p => p + amount);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        await supabase.from("user_progress").upsert({
          user_id: user.id,
          day_key: new Date().toISOString().slice(0,10),
          step: "win_points",
          details: { amount, at: new Date().toISOString() },
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id,day_key" });
      }
    } catch {}
    setTimeout(() => setPointsBurst(0), 1100);
  }

  async function finishExercise1ThenAskDOB(){
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        await supabase.from("user_progress").upsert({
          user_id: user.id,
          day_key: new Date().toISOString().slice(0,10),
          step: "exercise_done",
          details: { when: new Date().toISOString() },
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id,day_key" });
      }
    } catch {}

    await popConfetti();
    await awardPoints(50);

    pushBubble(`✨ Nice work. That small win wires momentum.`);
    setTimeout(() => { pushBubble(`Let’s do one more quick alignment to lock this in.`); }, 500);

    setTimeout(() => {
      setPhase("dob");
      pushBubble(`Tell me your date of birth (MM/DD/YYYY). I’ll map the numerology to “${get().currentWish?.wish || "your goal"}” and give you 3 aligned moves.`);
    }, 1000);
  }

  function isDOB(s=''){
    return /\b(0?[1-9]|1[0-2])[\/\-\.](0?[1-9]|[12][0-9]|3[01])[\/\-\.](19|20)\d{2}\b/.test(s.trim());
  }

  async function runNumerology(dob){
    setPhase("work");

    const wish = get().currentWish?.wish || "my goal";
    const systemHint =
`You are a supportive manifestation coach. Use basic numerology with DOB: ${dob}.
Context user's primary goal: "${wish}".
1) Derive life path or core numerology quickly (no long tables).
2) Explain 1-2 relevant traits in plain language (2-3 sentences).
3) Give exactly 3 specific, doable actions for the next 24 hours, aligned to goal + numerology.
Keep it upbeat, concise, and practical.`;

    const reply = await callGenie({ text: "Please analyze and advise.", systemHint });
    pushBubble(reply);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        await supabase.from("user_progress").upsert({
          user_id: user.id,
          day_key: new Date().toISOString().slice(0,10),
          step: "exercise2_done",
          details: { dob, at: new Date().toISOString() },
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id,day_key" });
      }
    } catch {}

    await awardPoints(75);
    await popConfetti();

    setTimeout(() => {
      pushBubble(`That’s a strong finish for today. Come back tomorrow for your next dose — or chat freely with me now.`);
      setPhase("free");
    }, 500);
  }

  async function send(){
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    setThinking(true);

    pushThread({ role:"user", content: text });
    setS(get());

    try {
      if (phase === "exercise1") {
        if (/^done\b/i.test(text)) {
          await finishExercise1ThenAskDOB();
          setThinking(false);
          return;
        } else {
          pushBubble(`No rush. Do the 2-min reset, then type **done** when finished.`);
          setThinking(false);
          return;
        }
      }

      if (phase === "dob") {
        if (isDOB(text)) {
          await runNumerology(text);
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
        if (rec) {
          setUiOffer({
            title: rec.title,
            why: belief
              ? `Limiting belief detected: “${belief}.” Tonight’s session dissolves that pattern so your next action feels natural.`
              : `Based on your goal, this short trance helps you move without overthinking.`,
            buyUrl: "https://hypnoticmeditations.ai/b/l0kmb"
          });
        }
      } catch {}

      const reply = await callGenie({ text: combined });
      pushBubble(reply);
    } catch {
      pushBubble("The lamp flickered. Try again in a moment.");
    } finally {
      setThinking(false);
    }
  }

  function onKey(e){
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  /* soft-confirm actions */
  function handleLooksRight() {
    // Fresh chat boot every time; no device-specific carryover
    set({ thread: [] });
    setStage("chat");
    setPhase("intro");
    setShowReadyCTA(false);
    autoIntroSequence();
  }
  function onTweak() { setShowTweaks(true); }
  function onApplyTweaks(next){
    setParsed({
      outcome: next.outcome || parsed.outcome,
      block: next.block || parsed.block,
      state: (next.state ?? parsed.state) || null
    });
    setShowTweaks(false);
    handleLooksRight();
  }

  const overlayStyles = `
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

      {/* Debug pill */}
      <div style={{ display:"flex", justifyContent:"center", margin:"10px 0" }}>
        <button
          onClick={() => setDebugOn(v => !v)}
          style={{
            fontSize:12, fontWeight:800, letterSpacing:.3,
            background: debugOn ? "#dcfce7" : "#e5e7eb",
            color: "#111", border:"1px solid rgba(0,0,0,0.15)",
            borderRadius: 999, padding:"6px 10px", cursor:"pointer"
          }}
          aria-pressed={debugOn}
        >
          Debug: {debugOn ? "ON" : "OFF"}
        </button>
      </div>

      {debugOn && (
        <div style={{
          maxWidth: 980, margin:"0 auto 10px", padding:12,
          background:"#0b1220", color:"#e5e7eb",
          border:"1px solid rgba(255,255,255,0.12)", borderRadius:12
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
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
                fontSize:12, padding:"4px 8px", borderRadius:8,
                border:"1px solid rgba(255,255,255,0.15)", background:"transparent", color:"#e5e7eb",
                cursor:"pointer"
              }}
            >
              Copy JSON
            </button>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}>
            <div style={{ background:"#0f172a", padding:10, borderRadius:8 }}>
              <div style={{ fontSize:12, opacity:.8, marginBottom:6 }}>firstName</div>
              <pre style={{ margin:0, fontSize:12, whiteSpace:"pre-wrap" }}>{pretty(S.firstName)}</pre>
            </div>
            <div style={{ background:"#0f172a", padding:10, borderRadius:8 }}>
              <div style={{ fontSize:12, opacity:.8, marginBottom:6 }}>vibe</div>
              <pre style={{ margin:0, fontSize:12, whiteSpace:"pre-wrap" }}>{pretty(S.vibe)}</pre>
            </div>
            <div style={{ background:"#0f172a", padding:10, borderRadius:8 }}>
              <div style={{ fontSize:12, opacity:.8, marginBottom:6 }}>currentWish</div>
              <pre style={{ margin:0, fontSize:12, whiteSpace:"pre-wrap" }}>{pretty(S.currentWish)}</pre>
            </div>
            <div style={{ background:"#0f172a", padding:10, borderRadius:8 }}>
              <div style={{ fontSize:12, opacity:.8, marginBottom:6 }}>prompt_spec</div>
              <pre style={{ margin:0, fontSize:12, whiteSpace:"pre-wrap" }}>{pretty(S.prompt_spec)}</pre>
            </div>
            <div style={{ gridColumn:"1 / span 2", background:"#0f172a", padding:10, borderRadius:8 }}>
              <div style={{ fontSize:12, opacity:.8, marginBottom:6 }}>lastChatPayload → /api/chat</div>
              <pre style={{ margin:0, fontSize:12, overflowX:"auto" }}>
                {pretty(lastChatPayload ?? { info: "No chat call yet. Send a message to populate lastChatPayload." })}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div style={{ maxWidth: 980, margin: "12px auto", padding: "0 10px", position:"relative" }}>
        {/* points burst */}
        {pointsBurst > 0 && (
          <div style={{
            position:"fixed", left:"50%", bottom: 96, transform:"translateX(-50%)", pointerEvents:"none",
            background:"rgba(255,214,0,0.95)", border:"1px solid rgba(0,0,0,0.12)", borderRadius:999,
            padding:"10px 16px", fontWeight:900, animation:"pointsPop 1.1s ease-out both", zIndex:60
          }}>
            +{pointsBurst}
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:10 }}>
          <div style={{ background:"#fff", border:"1px solid rgba(0,0,0,0.08)", borderRadius:16, padding:10 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <div style={{ fontWeight:900, fontSize:18 }}>Genie Chat</div>
            </div>

            {/* Stage: confirm (soft bar) */}
            {stage === "confirm" && (
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
                    onLooksRight={handleLooksRight}   // ← go straight to chat
                    onTweak={onTweak}
                  />
                </div>
              </>
            )}

            {/* Stage: chat */}
            {stage === "chat" && (
              <>
                <div
                  ref={listRef}
                  style={{
                    minHeight: 280, maxHeight: 420, overflowY: "auto",
                    border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 10, background: "#f8fafc"
                  }}
                >
                  {(S.thread || []).map(m => {
                    const isAI = m.role !== "user";
                    return (
                      <div
                        key={m.id || newId()}
                        style={{
                          marginBottom: 8, display: "flex", flexDirection: "column",
                          alignItems: isAI ? "flex-start" : "flex-end"
                        }}
                      >
                        <div style={{
                          fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4,
                          textAlign: isAI ? "left" : "right"
                        }}>
                          {isAI ? "Genie" : (S.firstName || "You")}
                        </div>
                        <div
                          style={{
                            background: isAI ? "rgba(0,0,0,0.04)" : "rgba(255,214,0,0.15)",
                            border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12,
                            padding: "8px 10px", maxWidth: "90%", whiteSpace: "pre-wrap", lineHeight: 1.4
                          }}
                          dangerouslySetInnerHTML={{ __html: nl2br(escapeHTML(m.content || "")) }}
                        />
                      </div>
                    );
                  })}

                  {uiOffer ? (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ border:"1px solid rgba(0,0,0,0.1)", borderRadius:12, padding:12 }}>
                        <div style={{ fontWeight:800, marginBottom:6 }}>{uiOffer.title}</div>
                        <div style={{ fontSize:13, color:"#334155", marginBottom:10 }}>{uiOffer.why}</div>
                        <a
                          href={uiOffer.buyUrl}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontWeight:800, textDecoration:"underline" }}
                        >
                          Explore »
                        </a>
                        <button onClick={()=>setUiOffer(null)} style={{ marginLeft:10 }}>Dismiss</button>
                      </div>
                    </div>
                  ) : null}

                  {thinking && (
                    <div style={{ opacity:.7, fontStyle:"italic", marginTop:6 }}>Genie is thinking…</div>
                  )}
                </div>

                {/* “Yes, I’m ready” CTA */}
                {showReadyCTA && (
                  <div style={{ marginTop: 10, textAlign:"center" }}>
                    <button
                      onClick={startExercise1}
                      style={{
                        appearance:"none", padding:"12px 18px", fontWeight:900, border:0, borderRadius:12,
                        background:"#111", color:"#ffd600", cursor:"pointer", boxShadow:"0 8px 24px rgba(0,0,0,.18)"
                      }}
                    >
                      Yes, I’m ready
                    </button>
                  </div>
                )}

                {/* input */}
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <textarea
                    rows={1}
                    value={input}
                    onChange={e=>setInput(e.target.value)}
                    onKeyDown={onKey}
                    placeholder={`Speak to your Genie, ${(S.firstName && S.firstName!=="Friend") ? S.firstName : "Friend"}…`}
                    style={{
                      flex:1, padding:"10px 12px", borderRadius:12, border:"1px solid rgba(0,0,0,0.15)", resize:"vertical"
                    }}
                  />
                  <button
                    onClick={send}
                    style={{
                      padding:"10px 14px", borderRadius:12, border:0, background:"#ffd600",
                      fontWeight:900, cursor:"pointer"
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
    </>
  );
}
