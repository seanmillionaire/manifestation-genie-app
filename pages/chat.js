// /pages/chat.js — SoftConfirm → Chat (intro → CTA → Exercise1 → DOB Numerology)
// RX is skipped entirely. Like buttons removed.

import { useEffect, useRef, useState } from "react";
import { useGenieConversation } from "../src/hooks/useGenieConversation";
import { useRouter } from "next/router";
import { get, set, newId, pushThread, toPlainMessages, startNewDaySession } from "../src/flowState";
import { supabase } from "../src/supabaseClient";
import TweakChips from "../components/Confirm/TweakChips";
import SoftConfirmBar from "../components/Confirm/SoftConfirmBar";
import { parseAnswers, scoreConfidence, variantFromScore } from "../src/features/confirm/decision";
import { detectBeliefFrom, recommendProduct } from "../src/engine/recommendProduct";
import { hydrateFirstNameFromSupabase } from "../src/userName";
import ChatBubble from "../components/Chat/ChatBubble";

/* tiny utils */
function escapeHTML(s = "") {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
function nl2br(s = "") { return s.replace(/\n/g, "<br/>"); }
function pretty(o) { try { return JSON.stringify(o, null, 2); } catch { return String(o); } }
function isYesNo(s = "") { return /^\s*(yes|y|no|n)\s*$/i.test(s); }
function isBoosterTyped(s = "", code = "") {
  return s.replace(/\s/g, "").includes((code || "").replace(/\s/g, ""));
}

/* confetti (client-only) */
let _confetti = null;
async function loadConfetti() {
  try { const m = await import("canvas-confetti"); _confetti = m.default || m; } catch {}
}
async function popConfetti() {
  try {
    if (!_confetti) return;
    const end = Date.now() + 800;
    (function frame() {
      _confetti({ particleCount: 8, angle: 60, spread: 70, origin: { x: 0 } });
      _confetti({ particleCount: 8, angle: 120, spread: 70, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    _confetti({ particleCount: 120, startVelocity: 52, spread: 360, ticks: 100, scalar: 1.0, origin: { y: 0.6 } });
  } catch {}
}

/* component */
export default function ChatPage() {
  const router = useRouter();
  const [S, setS] = useState(get());
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [uiOffer, setUiOffer] = useState(null);
  const [debugOn, setDebugOn] = useState(false);
  const [lastChatPayload, setLastChatPayload] = useState(null);
  const listRef = useRef(null);
  const { conversationId } = useGenieConversation();
  const [booted, setBooted] = useState(false);
  const [ringGlow, setRingGlow] = useState(false);

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

  // Gate: must have a vibe; hydrate name
  useEffect(() => {
    (async () => {
      const cur = get();
      if (!cur.vibe) { router.replace("/vibe"); return; }
      await hydrateFirstNameFromSupabase();
      setS(get());
    })();
  }, [router]);

  // Day-seeding: Day 2 vs new day
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    let state = get() || {};

    if (!state.lastSessionDate || state.lastSessionDate !== today) {
      // Check if last session was yesterday → Day-2 script
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yDate = yesterday.toISOString().slice(0, 10);

      if (state.lastSessionDate === yDate) {
        const fn = state.firstName && state.firstName !== "Friend" ? state.firstName : "Friend";
        const wish = state?.currentWish?.wish || "your wish";
        const booster = "🔑💰🚀";

        const msgs = [
          { id: newId(), role: "assistant", content: `🌟 Welcome back, ${fn}. I’ve kept the energy flowing from yesterday’s wish: **${wish}**.` },
          { id: newId(), role: "assistant", content: `✨ Did any signals or opportunities show up yesterday? (yes/no)` },
          { id: newId(), role: "assistant", content: `Today’s booster code: ${booster}. Type it to lock in abundance flow.` },
        ];

        const todaySession = {
          wish:  state?.currentWish?.wish  || "",
          block: state?.currentWish?.block || "",
          micro: state?.currentWish?.micro || "",
          date:  today,
        };

        set({
          ...state,
          currentSession: todaySession,
          thread: msgs,                 // use 'thread' for ChatBubble list rendering
          lastSessionDate: today,
          day2: { phase: "reflect", booster },
        });
        setS(get());
        return; // Day-2 seeded; stop
      }

      // Otherwise: start a brand-new day thread
      startNewDaySession({
        wish: state?.currentWish?.wish || "",
        block: state?.currentWish?.block || "",
        micro: state?.currentWish?.micro || "",
        vibe: state?.vibe || null,
      });
      state = get();
    }

    // Seed a clear first assistant message for today if the thread is empty
    const threadNow = Array.isArray(state.thread) ? state.thread : [];
    if (threadNow.length === 0) {
      const w = state?.currentSession?.wish  || state?.currentWish?.wish  || "";
      const b = state?.currentSession?.block || state?.currentWish?.block || "";
      const m = state?.currentSession?.micro || state?.currentWish?.micro || "";
      const dateNice = new Date().toLocaleDateString(undefined, {
        weekday: "long", month: "long", day: "numeric",
      });

      const first = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: [
          `✨ **${dateNice} — New Session**`,
          w ? `**Today's wish:** ${w}` : null,
          b ? `**Biggest block:** ${b}` : null,
          m ? `**Your micro-step:** ${m}` : null,
          `I'm with you—ready to move this forward right now. What feels like the very first nudge?`,
        ].filter(Boolean).join("\n"),
      };

      set({ ...state, thread: [first] });
      setS(get());
    }
  }, []);

  // hydrate existing conversation on refresh (server history)
  useEffect(() => {
    async function hydrate() {
      if (!conversationId) { setBooted(true); return; }
      try {
        const r = await fetch(`/api/history?conversationId=${conversationId}`);
        const { messages } = await r.json();

        const thread = (messages || []).map(m => ({
          id: newId(),
          role: m.role,
          content: m.content,
        }));

        if (thread.length > 0) {
          set({ thread });
          setS(get());
          setStage("chat");
          setPhase("free");
          setShowReadyCTA(false);
        }
      } catch {
        // ignore
      } finally {
        setBooted(true);
      }
    }
    hydrate();
  }, [conversationId]);

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

  // deterministic intro on empty thread (first-time)
  useEffect(() => {
    if (stage !== "chat") return;
    const empty = !Array.isArray(S.thread) || S.thread.length === 0;

    if (empty && !conversationId && phase !== "intro") {
      setPhase("intro");
      setShowReadyCTA(false);
      autoIntroSequence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, S.thread, conversationId]);

  /* soft-confirm actions */
  function handleLooksRight() {
    const hasExisting = Array.isArray(get().thread) && get().thread.length > 0;
    if (!hasExisting && !conversationId) {
      set({ thread: [] });
      setPhase("intro");
      setShowReadyCTA(false);
      autoIntroSequence();
    } else {
      setPhase("free");
      setShowReadyCTA(false);
    }
    setStage("chat");
  }
  function onTweak() { setShowTweaks(true); }
  function onApplyTweaks(next) {
    setParsed({
      outcome: next?.outcome ?? parsed.outcome,
      block:   next?.block   ?? parsed.block,
      state:  (next?.state ?? parsed.state) || null,
    });
    setShowTweaks(false);
    handleLooksRight();
  }

  async function callGenie({ text, systemHint = null }) {
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
      text,
    };
    setLastChatPayload(payload);

    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error("Genie API error");
    const data = await resp.json();
    return data?.reply || "I’m here.";
  }

  function pushBubble(line) {
    pushThread({ role: "assistant", content: line, id: newId() });
    setS(get());
  }

  function autoIntroSequence() {
    const st = get();
    const fn = st.firstName && st.firstName !== "Friend" ? st.firstName : "Friend";
    const wish = st.currentWish?.wish || "your goal";
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

  function startExercise1() {
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
      `Type **done** when you finish.`,
    ].join("\n");
    pushBubble(msg);
  }

  async function awardPoints(amount = 50) {
    setPointsBurst((p) => p + amount);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        await supabase.from("user_progress").upsert(
          {
            user_id: user.id,
            day_key: new Date().toISOString().slice(0, 10),
            step: "win_points",
            details: { amount, at: new Date().toISOString() },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,day_key" }
        );
      }
    } catch {}
    setTimeout(() => setPointsBurst(0), 1100);
  }

  async function finishExercise1ThenAskDOB() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        await supabase.from("user_progress").upsert(
          {
            user_id: user.id,
            day_key: new Date().toISOString().slice(0, 10),
            step: "exercise_done",
            details: { when: new Date().toISOString() },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,day_key" }
        );
      }
    } catch {}

    await popConfetti();
    await awardPoints(50);

    pushBubble(`✨ Nice work. That small win wires momentum.`);
    setTimeout(() => { pushBubble(`Let’s do one more quick alignment to lock this in.`); }, 500);

    setTimeout(() => {
      setPhase("dob");
      pushBubble(
        `Tell me your date of birth (MM/DD/YYYY). I’ll map the numerology to “${get().currentWish?.wish || "your goal"}” and give you 3 aligned moves.`
      );
    }, 1000);
  }

  function isDOB(s = "") {
    return /\b(0?[1-9]|1[0-2])[\/\-\.](0?[1-9]|[12][0-9]|3[01])[\/\-\.](19|20)\d{2}\b/.test(s.trim());
  }

  async function runNumerology(dob) {
    setPhase("work");

    const wish = get().currentWish?.wish || "my goal";
    const systemHint = `You are a supportive manifestation coach. Use basic numerology with DOB: ${dob}.
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
        await supabase.from("user_progress").upsert(
          {
            user_id: user.id,
            day_key: new Date().toISOString().slice(0, 10),
            step: "exercise2_done",
            details: { dob, at: new Date().toISOString() },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,day_key" }
        );
      }
    } catch {}

    await awardPoints(75);
    await popConfetti();

    setTimeout(() => {
      pushBubble(`That’s a strong finish for today. Come back tomorrow for your next dose — or chat freely with me now.`);
      setPhase("free");
    }, 500);
  }

  async function send() {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    setThinking(true);

    pushThread({ role: "user", content: text, id: newId() });
    setS(get());

    try {
      // --- Day-2 scripted interaction ---
      const stNow = get();
      if (stNow.day2 && stNow.day2.phase) {
        const d2 = stNow.day2;

        // 1) Reflection step (expects yes/no)
        if (d2.phase === "reflect") {
          if (!isYesNo(text)) {
            pushBubble(`Just a quick check-in — type **yes** or **no** ✨`);
            setThinking(false);
            return;
          }
          const saidYes = /^\s*(yes|y)\s*$/i.test(text);
          pushBubble(saidYes ? `🔥 Love it. That’s momentum showing up.` : `All good — today we prime the signal.`);

          // move to booster prompt
          set({ ...get(), day2: { ...d2, phase: "booster" } });
          setS(get());
          pushBubble(`Type today’s booster code to lock it: ${d2.booster}`);
          setThinking(false);
          return;
        }

        // 2) Booster step (expects the emoji sequence)
        if (d2.phase === "booster") {
          if (!isBoosterTyped(text, d2.booster)) {
            pushBubble(`Close — type the exact booster: ${d2.booster}`);
            setThinking(false);
            return;
          }

          // mark done, celebrate, nudge ring
          set({ ...get(), day2: { ...d2, phase: "done" } });
          setS(get());
          await popConfetti();
          pushBubble(`Keep your vibe high and take one aligned action. I’ll be here to amplify tomorrow ✨`);
          setPhase("free");

          setRingGlow(true);
          setTimeout(() => setRingGlow(false), 1100);
          setTimeout(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, 0);

          // optional: persist an event
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (user) {
              await supabase.from("user_progress").upsert(
                {
                  user_id: user.id,
                  day_key: new Date().toISOString().slice(0, 10),
                  step: "day2_booster_done",
                  details: { booster: d2.booster, at: new Date().toISOString() },
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id,day_key" }
              );
            }
          } catch {}

          setThinking(false);
          return;
        }
      }

      // Exercise flow
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
            buyUrl: "https://hypnoticmeditations.ai/b/l0kmb",
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

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
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
      <style dangerouslySetInnerHTML={{ __html: overlayStyles }} />

      {debugOn && (
        <div style={{
          maxWidth: 980, margin: "0 auto 10px", padding: 12,
          background: "#0b1220", color: "#e5e7eb",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Live FlowState Snapshot</strong>
            <button
              onClick={() => {
                try {
                  const snapshot = {
                    firstName: S.firstName || null,
                    vibe: S.vibe || null,
                    currentWish: S.currentWish || null,
                    prompt_spec: S.prompt_spec || null,
                    lastChatPayload,
                  };
                  navigator.clipboard?.writeText(JSON.stringify(snapshot, null, 2));
                } catch {}
              }}
              style={{
                fontSize: 12, padding: "4px 8px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#e5e7eb",
                cursor: "pointer",
              }}
            >
              Copy JSON
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <div style={{ background: "#0f172a", padding: 10, borderRadius: 8 }}>
              <div style={{ fontSize: 12, opacity: .8, marginBottom: 6 }}>firstName</div>
              <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>{pretty(S.firstName)}</pre>
            </div>
            <div style={{ background: "#0f172a", padding: 10, borderRadius: 8 }}>
              <div style={{ fontSize: 12, opacity: .8, marginBottom: 6 }}>vibe</div>
              <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>{pretty(S.vibe)}</pre>
            </div>
            <div style={{ background: "#0f172a", padding: 10, borderRadius: 8 }}>
              <div style={{ fontSize: 12, opacity: .8, marginBottom: 6 }}>currentWish</div>
              <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>{pretty(S.currentWish)}</pre>
            </div>
            <div style={{ background: "#0f172a", padding: 10, borderRadius: 8 }}>
              <div style={{ fontSize: 12, opacity: .8, marginBottom: 6 }}>prompt_spec</div>
              <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>{pretty(S.prompt_spec)}</pre>
            </div>
            <div style={{ gridColumn: "1 / span 2", background: "#0f172a", padding: 10, borderRadius: 8 }}>
              <div style={{ fontSize: 12, opacity: .8, marginBottom: 6 }}>lastChatPayload → /api/chat</div>
              <pre style={{ margin: 0, fontSize: 12, overflowX: "auto" }}>
                {pretty(lastChatPayload ?? { info: "No chat call yet. Send a message to populate lastChatPayload." })}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div style={{ maxWidth: 980, margin: "12px auto", padding: "0 10px", position: "relative" }}>
        {/* points burst */}
        {pointsBurst > 0 && (
          <div
            style={{
              position: "fixed", left: "50%", bottom: 96, transform: "translateX(-50%)",
              pointerEvents: "none", background: "rgba(255,214,0,0.95)",
              border: "1px solid rgba(0,0,0,0.12)", borderRadius: 999,
              padding: "10px 16px", fontWeight: 900, animation: "pointsPop 1.1s ease-out both", zIndex: 60,
            }}
          >
            +{pointsBurst}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Genie Chat</div>
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
                      onClose={() => setShowTweaks(false)}
                    />
                  </div>
                )}
                <div style={{ marginBottom: 8 }}>
                  <SoftConfirmBar
                    outcome={parsed?.outcome}
                    block={parsed?.block}
                    onLooksRight={handleLooksRight}
                    onTweak={onTweak}
                  />
                </div>
              </>
            )}

            {/* Stage: chat */}
            {stage === "chat" && (
              <>
                {/* --- Today Recap (compact + circular progress) --- */}
                {(() => {
                  // baseline 75; +3 while waiting booster; +5 after success
                  let pct = 75;
                  const d2phase = S.day2?.phase || null;
                  if (d2phase === "booster") pct = 78;
                  if (d2phase === "done")    pct = 80;

                  const wish  = S.currentSession?.wish  ?? S.currentWish?.wish;
                  const block = S.currentSession?.block ?? S.currentWish?.block;
                  const micro = S.currentSession?.micro ?? S.currentWish?.micro;

                  const R = 18;
                  const C = 2 * Math.PI * R;
                  const offset = C * (1 - pct / 100);

                  return (
                    <div className="recap" aria-live="polite">
                      <div className="left">
                        <div className="title">
                          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} — Today
                        </div>
                        <div className="line">
                          {wish  ? <span><strong>Wish:</strong> {wish}</span> : null}
                          {block ? <span><strong>Block:</strong> {block}</span> : null}
                          {micro ? <span><strong>Step:</strong> {micro}</span> : null}
                        </div>
                      </div>

                      <div
                        className={`ring ${ringGlow ? "glow" : ""}`}
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={pct}
                        aria-label="Today's progress"
                      >
                        <svg className="svg" viewBox="0 0 44 44">
                          <defs>
                            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%"   stopColor="#ffb74d" />
                              <stop offset="50%"  stopColor="#ff9800" />
                              <stop offset="100%" stopColor="#fb8c00" />
                            </linearGradient>
                          </defs>
                          <circle cx="22" cy="22" r={R} stroke="#ffe0a3" strokeWidth="4" fill="none" />
                          <circle
                            cx="22" cy="22" r={R}
                            stroke="url(#ringGrad)" strokeWidth="5" fill="none" strokeLinecap="round"
                            strokeDasharray={C} strokeDashoffset={offset}
                            transform="rotate(-90 22 22)"
                            style={{ transition: "stroke-dashoffset 400ms ease" }}
                          />
                        </svg>
                        <div className="pct">{pct}%</div>
                      </div>

                      <style jsx>{`
                        .ring.glow .svg { animation: ringPulse 1000ms ease-out both; }
                        @keyframes ringPulse {
                          0%   { transform: scale(1);   filter: drop-shadow(0 0 0 rgba(255,153,0,0)); }
                          40%  { transform: scale(1.06); filter: drop-shadow(0 0 14px rgba(255,153,0,.45)); }
                          100% { transform: scale(1);   filter: drop-shadow(0 0 0 rgba(255,153,0,0)); }
                        }
                        .recap {
                          display: flex;
                          align-items: center;
                          justify-content: space-between;
                          gap: 10px;
                          padding: 6px 10px;
                          border-radius: 8px;
                          background: #fff8e6;
                          border: 1px solid rgba(255,165,0,.35);
                          font-size: 13px;
                          line-height: 1.3;
                          margin: 4px 0 8px;
                        }
                        .left { min-width: 0; }
                        .title { font-weight: 700; margin-bottom: 2px; }
                        .line {
                          display: flex; gap: 8px; flex-wrap: nowrap;
                          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                        }
                        .line > span:not(:last-child)::after { content: " | "; opacity: .5; margin-left: 8px; }
                        .ring { position: relative; width: 44px; height: 44px; flex: 0 0 auto; }
                        .svg { display: block; width: 44px; height: 44px; filter: drop-shadow(0 0 6px rgba(255,153,0,.18)); }
                        .pct { position: absolute; inset: 0; display: grid; place-items: center; font-weight: 800; font-size: 11px; color: #9a6a00; }
                        @media (prefers-reduced-motion: reduce) {
                          .svg circle[stroke-dashoffset] { transition: none !important; }
                        }
                      `}</style>
                    </div>
                  );
                })()}

                {/* Day-2 quick reply chips */}
                {S.day2?.phase === "reflect" && (
                  <div style={{ display: "flex", gap: 8, margin: "6px 0 8px" }}>
                    <button
                      type="button"
                      onClick={() => { setInput("yes"); send(); }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid rgba(0,0,0,.15)",
                        background: "#ffffff",
                        cursor: "pointer",
                        fontWeight: 800,
                      }}
                      aria-label="Yes, I noticed signals or opportunities"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => { setInput("no"); send(); }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid rgba(0,0,0,.15)",
                        background: "#ffffff",
                        cursor: "pointer",
                        fontWeight: 800,
                      }}
                      aria-label="No, I didn’t notice signals yet"
                    >
                      No
                    </button>
                  </div>
                )}

                {/* Thread */}
                <div
                  ref={listRef}
                  style={{
                    minHeight: 280, maxHeight: 420, overflowY: "auto",
                    border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 10, background: "#f8fafc",
                  }}
                >
                  {(S.thread || []).map((m) => (
                    <ChatBubble
                      key={m.id || newId()}
                      id={m.id || newId()}
                      role={m.role}
                      content={nl2br(escapeHTML(m.content || ""))}
                    />
                  ))}

                  {uiOffer ? (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: 12 }}>
                        <div style={{ fontWeight: 800, marginBottom: 6 }}>{uiOffer.title}</div>
                        <div style={{ fontSize: 13, color: "#334155", marginBottom: 10 }}>{uiOffer.why}</div>
                        <a
                          href={uiOffer.buyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontWeight: 800, textDecoration: "underline" }}
                        >
                          Explore »
                        </a>
                        <button onClick={() => setUiOffer(null)} style={{ marginLeft: 10 }}>Dismiss</button>
                      </div>
                    </div>
                  ) : null}

                  {thinking && (
                    <div style={{ opacity: .7, fontStyle: "italic", marginTop: 6 }}>Genie is thinking…</div>
                  )}
                </div>

                {/* “Yes, I’m ready” CTA */}
                {showReadyCTA && (
                  <div style={{ marginTop: 10, textAlign: "center" }}>
                    <button
                      onClick={startExercise1}
                      style={{
                        appearance: "none", padding: "12px 18px", fontWeight: 900, border: 0, borderRadius: 12,
                        background: "#111", color: "#ffd600", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,.18)",
                      }}
                    >
                      Yes, I’m ready
                    </button>
                  </div>
                )}

                {/* input */}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKey}
                    placeholder={`Speak to your Genie, ${(S.firstName && S.firstName !== "Friend") ? S.firstName : "Friend"}…`}
                    style={{
                      flex: 1, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.15)", resize: "vertical",
                    }}
                  />
                  <button
                    onClick={send}
                    style={{
                      padding: "10px 14px", borderRadius: 12, border: 0, background: "#ffd600",
                      fontWeight: 900, cursor: "pointer",
                    }}
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Debug pill at the bottom */}
          <div style={{ display: "flex", justifyContent: "center", margin: "6px 0 12px" }}>
            <button
              onClick={() => setDebugOn((v) => !v)}
              style={{
                fontSize: 12, fontWeight: 800, letterSpacing: .3,
                background: debugOn ? "#dcfce7" : "#e5e7eb",
                color: "#111", border: "1px solid rgba(0,0,0,0.15)",
                borderRadius: 999, padding: "6px 10px", cursor: "pointer",
              }}
              aria-pressed={debugOn}
            >
              Debug: {debugOn ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
