// GenieDailyPortal.jsx — ONE exercise/day with Shockcard (2), Ritual Button (3), Proof Ticker (6)
// Usage in your chat page: <GenieDailyPortal userName="Sean" dream="$1K/day from HM" initialProof={12842} />
// No external deps. White theme. Interlocks steps: Shock → Ritual → Exercise → Proof → Lock until 5:00 AM local.

import React, { useEffect, useMemo, useRef, useState } from "react";

/* =========================
   Brand Tokens (white theme)
   ========================= */
const UI = {
  ink: "#0f172a",
  sub: "#475569",
  muted: "#64748b",
  line: "#e5e7eb",
  brand: "#6633cc",
  brandDk: "#4f27a3",
  gold: "#f59e0b",
  wash: "#ffffff",
  glow: "rgba(167,139,250,.35)",
  radius: 16
};

/* =========================================================
   Daily Gate @ 05:00 LOCAL — lock today after completion
   ========================================================= */
const DAILY_UNLOCK_HOUR = 5; // 5:00 local

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function nextUnlockDate() {
  const now = new Date();
  const unlock = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    DAILY_UNLOCK_HOUR,
    0,
    0,
    0
  );
  if (now >= unlock) {
    unlock.setDate(unlock.getDate() + 1);
  }
  return unlock;
}
function timeUntilUnlockStr() {
  const n = new Date();
  const u = nextUnlockDate();
  const ms = u - n;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

/* ============================================
   Proof Counter (client-only, local seed)
   ============================================ */
function useProofCounter(initialSeed = 12000) {
  const [count, setCount] = useState(() => {
    if (typeof window === "undefined") return initialSeed;
    const saved = localStorage.getItem("genie_proof_total");
    if (saved) return parseInt(saved, 10);
    // Seed with a lively baseline + small random jitter
    const seed = initialSeed + Math.floor(Math.random() * 200);
    localStorage.setItem("genie_proof_total", String(seed));
    return seed;
  });
  const bump = (n = 1) => {
    setCount(c => {
      const v = c + n;
      if (typeof window !== "undefined") {
        localStorage.setItem("genie_proof_total", String(v));
      }
      return v;
    });
  };
  return { count, bump };
}

/* ====================================================
   Visual Shockcards (2): animated sigils/number codes
   ==================================================== */
const SHOCKCARDS = [
  { id: "1111", title: "11:11 — Alignment Portal", mantra: "I am precisely on time." },
  { id: "777", title: "777 — Fortunate Flow", mantra: "I am the probability of prosperity." },
  { id: "888", title: "888 — Infinite Yield", mantra: "Money multiplies while I breathe." }
];
function Shockcard({ code = "1111", onContinue }) {
  const cfg = SHOCKCARDS.find(s => s.id === code) || SHOCKCARDS[0];
  return (
    <div style={{
      border: `1px solid ${UI.line}`, borderRadius: UI.radius, padding: 18, background: UI.wash,
      boxShadow: `0 18px 50px ${UI.glow}`, textAlign: "center"
    }}>
      <div style={{ fontWeight: 800, fontSize: 18, color: UI.ink, marginBottom: 8 }}>✨ {cfg.title}</div>
      <div style={{ color: UI.sub, fontSize: 14, marginBottom: 12 }}>Stare 7 seconds. Whisper the mantra once.</div>
      <div style={{ position: "relative", height: 180, margin: "0 auto 14px", maxWidth: 360 }}>
        {/* Animated sigil */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 9999,
          background: `conic-gradient(from 0deg, ${UI.brand}, ${UI.gold}, ${UI.brand})`,
          filter: "blur(18px)", opacity: .35, animation: "spin 7s linear infinite"
        }} />
        <div style={{
          position: "absolute", inset: 20, borderRadius: 9999,
          border: `2px dashed ${UI.brandDk}`, animation: "pulse 2.5s ease-in-out infinite"
        }} />
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          color: UI.ink, fontWeight: 900, fontSize: 56, letterSpacing: 2
        }}>{cfg.id}</div>
      </div>
      <div style={{ color: UI.ink, fontWeight: 700, marginBottom: 10 }}>“{cfg.mantra}”</div>
      <button onClick={onContinue} style={btnPrimary()}>I felt it — continue</button>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(102,51,204,.35) }
          70% { box-shadow: 0 0 0 24px rgba(102,51,204,0) }
          100% { box-shadow: 0 0 0 0 rgba(102,51,204,0) }
        }
      `}</style>
    </div>
  );
}

/* ==================================================
   Ritual Button (3): glitch-seal micro-interaction
   ================================================== */
function RitualSeal({ onSealed }) {
  const [glitch, setGlitch] = useState(false);
  const click = () => {
    setGlitch(true);
    setTimeout(() => {
      setGlitch(false);
      onSealed?.();
    }, 1100);
  };
  return (
    <div style={{
      border: `1px solid ${UI.line}`, borderRadius: UI.radius, padding: 18, background: UI.wash,
      boxShadow: `0 18px 50px ${UI.glow}`, textAlign: "center"
    }}>
      <div style={{ fontWeight: 800, fontSize: 18, color: UI.ink, marginBottom: 8 }}>Break the Loop</div>
      <div style={{ color: UI.sub, fontSize: 14, marginBottom: 14 }}>
        Click to crack the old pattern. Screen will pulse — that’s your seal.
      </div>
      <button onClick={click} className={glitch ? "glx" : ""} style={btnPrimary({ fontSize: 16 })}>
        {glitch ? "Sealing…" : "Seal Today’s Shift"}
      </button>
      <style>{`
        .glx { position: relative; overflow: hidden; }
        .glx::before, .glx::after {
          content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, ${UI.gold}, transparent);
          animation: sweep .9s ease forwards;
          mix-blend-mode: overlay; opacity: .8;
        }
        .glx::after { animation-delay: .15s }
        @keyframes sweep {
          0% { transform: translateX(-120%) }
          100% { transform: translateX(120%) }
        }
        /* Screen pulse */
        body { transition: background .2s ease }
        .glx:active ~ * {}
      `}</style>
    </div>
  );
}

/* ==========================================================
   Exercise Library (from your earlier spec, condensed fields)
   Categories: O, P, N, Ph, C — each item includes check-in
   ========================================================== */
const EXERCISES = [
  // ---------- Ontology (6)
  { id: "O-1", cat: "O", title: "Identity Switch (90s)",
    steps: [
      "Say out loud: “I am the one money trusts.”",
      "Stand tall: shoulders back; inhale 4, exhale 6 (x3).",
      "Send ONE message that could bring money today."
    ],
    check: "What changed in your posture/energy (1 word)?"
  },
  { id: "O-2", cat: "O", title: "Future-Normal (2m)",
    steps: [
      "Imagine $1K/day is normal — again today.",
      "Pick ONE habit Future-You does automatically.",
      "Do it now."
    ],
    check: "Name the habit + rate certainty 1–10."
  },
  { id: "O-3", cat: "O", title: "Boundary Install (2m)",
    steps: ["Whisper: “My energy is premium.”", "Decline one drain today."],
    check: "What did you say no to?"
  },
  { id: "O-4", cat: "O", title: "Value Broadcast (3m)",
    steps: ["Write a 1-sentence promise you deliver.", "Post/send it once."],
    check: "Paste the sentence."
  },
  { id: "O-5", cat: "O", title: "Decision Lock (2m)",
    steps: ["Pick one lingering decision.", "Decide now. No second pass."],
    check: "What did you decide?"
  },
  { id: "O-6", cat: "O", title: "Identity Proof (3m)",
    steps: ["List 3 receipts (times you created money).", "Read them out loud."],
    check: "Which receipt hit hardest?"
  },

  // ---------- Psychology (6)
  { id: "P-1", cat: "P", title: "Pattern Interrupt (60s)",
    steps: ["When worry spikes: say 'Stop. Not mine.'", "Breath 4/6 once.", "Tap wrist 7x: “I am safe to receive.”"],
    check: "Intensity drop % (0–100)?"
  },
  { id: "P-2", cat: "P", title: "Inner Prosecutor → Defender (3m)",
    steps: ["Write the harsh thought verbatim.", "Now write a 2-line defense brief."],
    check: "Post the 2-line defense."
  },
  { id: "P-3", cat: "P", title: "Money Shame Rinse (3m)",
    steps: ["Name earliest money embarrassment (label only).", "Whisper: 'I forgive the copy. I keep the lesson.'"],
    check: "One lesson you keep?"
  },
  { id: "P-4", cat: "P", title: "Fear to Task (2m)",
    steps: ["Write the fear in 5 words.", "Translate into ONE tiny action today."],
    check: "Fear → Action?"
  },
  { id: "P-5", cat: "P", title: "Overwhelm Box (2m)",
    steps: ["Dump every 'should' for 60s.", "Circle ONE needle-mover."],
    check: "What did you circle?"
  },
  { id: "P-6", cat: "P", title: "Comparison Kill (90s)",
    steps: ["Mute/hide 3 scarcity-trigger accounts."],
    check: "Body now (1 word)?"
  },

  // ---------- Neuropsychology (6)
  { id: "N-1", cat: "N", title: "7-Breath Reset (90s)",
    steps: ["Inhale 4 / hold 4 / exhale 6 — 7 rounds.",
            "On each exhale: “Money flows when I breathe.”"],
    check: "Calm level now (1–10)?"
  },
  { id: "N-2", cat: "N", title: "Wrist Anchor (60s)",
    steps: ["Press fingers to left wrist pulse.",
            "Repeat 7x: “Stripe sings for me today.”"],
    check: "What sensation at the pulse?"
  },
  { id: "N-3", cat: "N", title: "Visual Micro-Loop (2m)",
    steps: ["Eyes closed: see today’s $1K ping.",
            "Loop the scene 7 times quickly."],
    check: "One word for the feeling?"
  },
  { id: "N-4", cat: "N", title: "Task Pairing (3m)",
    steps: ["Pair your most resisted task with a favorite song.",
            "Start both; stop when the song ends."],
    check: "Did you start? What got done?"
  },
  { id: "N-5", cat: "N", title: "Micro-Rep Goal (2m)",
    steps: ["Pick a 2-min money action. Do it now."],
    check: "What micro-rep did you complete?"
  },
  { id: "N-6", cat: "N", title: "Sleep Primer (tonight, 1m)",
    steps: ["3 slow breaths; whisper: 'My brain consolidates wins.'",
            "See tomorrow’s ping once."],
    check: "Did you wake with an idea? What?"
  },

  // ---------- Phenomenology (6)
  { id: "Ph-1", cat: "Ph", title: "Somatic Yes (2m)",
    steps: ["Recall a real win; find the body-spot that lights up.",
            "Rub that spot and say: 'Do it again.'"],
    check: "Where in your body turned on?"
  },
  { id: "Ph-2", cat: "Ph", title: "Scene Swap (3m)",
    steps: ["Take today’s dread scene.", "Swap soundtrack + lighting to playful."],
    check: "Mood after swap (1 word)?"
  },
  { id: "Ph-3", cat: "Ph", title: "Five-Sense Deposit (3m)",
    steps: ["Describe in 1 line each how $1K/day smells, tastes, looks, sounds, feels."],
    check: "Paste your 5 lines."
  },
  { id: "Ph-4", cat: "Ph", title: "Gratitude Needle (2m)",
    steps: ["Find gratitude for ONE tiny business detail."],
    check: "What did you bless?"
  },
  { id: "Ph-5", cat: "Ph", title: "Micro-Win Hunt (2m)",
    steps: ["Collect 3 micro wins from last 24h."],
    check: "List the 3 wins."
  },
  { id: "Ph-6", cat: "Ph", title: "Time-Bridge (2m)",
    steps: ["Write: 'It already happened, I’m just catching up.' (read 3x)"],
    check: "Certainty now (1–10)?"
  },

  // ---------- Cosmology (6)
  { id: "C-1", cat: "C", title: "11:11 Pause (30s when seen)",
    steps: ["When repeating numbers appear: palm on heart:",
            "Say: 'I am in flow. Continue.'"],
    check: "Which number showed up first?"
  },
  { id: "C-2", cat: "C", title: "Prosperity Walk (5m)",
    steps: ["Walk today; spot 7 signs of abundance (green, gold, growth)."],
    check: "Name 3 signs you spotted."
  },
  { id: "C-3", cat: "C", title: "Offer to One (2m)",
    steps: ["Ask: 'Who needs my gift today?'", "Send ONE direct helpful note."],
    check: "Who did you serve?"
  },
  { id: "C-4", cat: "C", title: "Tithe of Attention (2m)",
    steps: ["Give 120s undivided attention to a loved one or customer."],
    check: "What brightened?"
  },
  { id: "C-5", cat: "C", title: "Signal Journal (3m)",
    steps: ["Write one synchronicity + the action it suggests."],
    check: "What action will you take?"
  },
  { id: "C-6", cat: "C", title: "Lunar Nudge (tonight, 2m)",
    steps: ["30s sky-gaze. Whisper: 'Guide my next right move.'"],
    check: "What nudge did you wake with?"
  }
];

/* =========================================================
   Selector: rotate O → P → N → Ph → C; adapt if shift < 7
   ========================================================= */
const ROTATION = ["O", "P", "N", "Ph", "C"];
function selectTodaysExercise(lastCat, lastShiftScore) {
  let idx = lastCat ? ROTATION.indexOf(lastCat) : -1;
  // If yesterday underperformed, bias to Psych/Neuro
  if (typeof lastShiftScore === "number" && lastShiftScore < 7) {
    return pickByCat(["P", "N"]);
  }
  idx = (idx + 1) % ROTATION.length;
  return pickByCat([ROTATION[idx]]);
}
function pickByCat(catList) {
  const pool = EXERCISES.filter(e => catList.includes(e.cat));
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ==========================================
   Exercise Card — step-by-step, gated
   ========================================== */
function ExerciseCard({ exercise, onComplete }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [checkin, setCheckin] = useState("");
  const [shift, setShift] = useState(8); // default 8/10 vibe
  const total = exercise.steps.length;

  const next = () => setStepIdx(i => Math.min(i + 1, total));
  const prev = () => setStepIdx(i => Math.max(i - 1, 0));
  const submit = () => {
    if (!checkin.trim()) return;
    onComplete?.({ checkin, shift: Number(shift) });
  };

  return (
    <div style={{
      border: `1px solid ${UI.line}`, borderRadius: UI.radius, padding: 18, background: UI.wash,
      boxShadow: `0 18px 50px ${UI.glow}`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: UI.ink }}>{exercise.title}</div>
        <div style={{ fontSize: 12, color: UI.muted }}>{Math.min(stepIdx + 1, total + 1)}/{total + 1}</div>
      </div>
      {stepIdx < total ? (
        <>
          <p style={{ color: UI.sub, fontSize: 14, marginBottom: 12 }}>{exercise.steps[stepIdx]}</p>
          <div style={{ display: "flex", gap: 10 }}>
            {stepIdx > 0 && <button onClick={prev} style={btnGhost()}>Back</button>}
            <button onClick={next} style={btnPrimary()}>{stepIdx === total - 1 ? "I did it" : "Next step"}</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ color: UI.ink, fontWeight: 700, marginBottom: 8 }}>Seal your proof.</div>
          <label style={{ display: "block", fontSize: 14, color: UI.sub, marginBottom: 6 }}>{exercise.check}</label>
          <textarea
            value={checkin}
            onChange={e => setCheckin(e.target.value)}
            rows={3}
            placeholder="Type your 1-line check-in…"
            style={{
              width: "100%", border: `1px solid ${UI.line}`, borderRadius: 12, padding: 10,
              outline: "none", fontFamily: "inherit", fontSize: 14, color: UI.ink, marginBottom: 10
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <label style={{ fontSize: 13, color: UI.muted }}>Felt shift (1–10):</label>
            <input type="number" min={1} max={10} value={shift}
              onChange={e => setShift(e.target.value)}
              style={{ width: 64, border: `1px solid ${UI.line}`, borderRadius: 10, padding: "6px 8px", fontSize: 14 }} />
          </div>
          <button onClick={submit} style={btnPrimary({ width: "100%" })}>Submit proof & finish</button>
        </>
      )}
    </div>
  );
}

/* =======================
   Buttons (unstyled CSS)
   ======================= */
function btnPrimary(extra = {}) {
  return {
    background: `linear-gradient(90deg, ${UI.brand}, ${UI.gold})`,
    color: "#fff", border: "none", borderRadius: 12, padding: "10px 14px",
    fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: `0 10px 28px ${UI.glow}`,
    ...extra
  };
}
function btnGhost(extra = {}) {
  return {
    background: "#fff", color: UI.ink, border: `1px solid ${UI.line}`,
    borderRadius: 12, padding: "10px 14px", fontWeight: 700, fontSize: 14, cursor: "pointer", ...extra
  };
}

/* ==========================================
   MAIN: GenieDailyPortal
   ========================================== */
export default function GenieDailyPortal({
  userName = "Friend",
  dream = "$1K/day",
  initialProof = 12000
}) {
  const { count, bump } = useProofCounter(initialProof);
  const tKey = todayKey();

  // Persistent daily record
  const [record, setRecord] = useState(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("genie_daily_" + tKey);
    return raw ? JSON.parse(raw) : null;
  });

  // Last history (for selector)
  const lastMeta = useMemo(() => {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem("genie_daily_lastmeta");
    return raw ? JSON.parse(raw) : {};
  }, []);

  // Gate: if already completed today, lock
  const completedToday = !!record?.done;

  // Select exercise for today (once)
  const [exercise] = useState(() => {
    if (record?.exerciseId) {
      return EXERCISES.find(e => e.id === record.exerciseId) || selectTodaysExercise(lastMeta.cat, lastMeta.shift);
    }
    return selectTodaysExercise(lastMeta.cat, lastMeta.shift);
  });

  // Shockcard pick
  const shock = useMemo(() => {
    const pool = ["1111", "777", "888"];
    return pool[Math.floor(Math.random() * pool.length)];
  }, [tKey]);

  // Step control: 0 shock → 1 ritual → 2 exercise
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!record) {
      const seed = { exerciseId: exercise.id, done: false, step: 0 };
      localStorage.setItem("genie_daily_" + tKey, JSON.stringify(seed));
      setRecord(seed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tKey]);

  const proceed = () => {
    const next = Math.min(step + 1, 2);
    setStep(next);
    persist({ step: next });
  };

  const persist = (patch) => {
    if (typeof window === "undefined") return;
    const current = JSON.parse(localStorage.getItem("genie_daily_" + tKey) || "{}");
    const merged = { ...current, ...patch };
    localStorage.setItem("genie_daily_" + tKey, JSON.stringify(merged));
    setRecord(merged);
  };

  const finish = ({ checkin, shift }) => {
    // Save today
    persist({ done: true, checkin, shift, finishedAt: new Date().toISOString() });
    // Save last meta for tomorrow’s selector
    if (typeof window !== "undefined") {
      localStorage.setItem("genie_daily_lastmeta", JSON.stringify({ cat: exercise.cat, shift }));
    }
    // Proof ticker bump
    bump(1);
  };

  return (
    <div className="hm-embed" style={{
      maxWidth: 880, margin: "0 auto", fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      color: UI.ink
    }}>

      {/* Header + Proof Ticker (6) */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", border: `1px solid ${UI.line}`, borderRadius: UI.radius,
        background: UI.wash, marginBottom: 14, boxShadow: `0 10px 30px ${UI.glow}`
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 12, background: `linear-gradient(45deg, ${UI.brand}, ${UI.gold})`
          }} />
          <div>
            <div style={{ fontWeight: 900, fontSize: 15 }}>Manifestation Genie</div>
            <div style={{ fontSize: 12, color: UI.muted }}>Hi {userName}. Today’s portal for <b>{dream}</b> is open.</div>
          </div>
        </div>
        <div style={{
          fontWeight: 800, fontSize: 14, color: UI.ink, border: `1px solid ${UI.line}`,
          borderRadius: 12, padding: "6px 10px", background: "#fff"
        }}>
          ✨ Wishes granted today: <span className="ticker">{count.toLocaleString()}</span>
        </div>
      </div>

      {!completedToday ? (
        <>
          {step === 0 && (
            <Shockcard code={shock} onContinue={proceed} />
          )}
          {step === 1 && (
            <RitualSeal onSealed={proceed} />
          )}
          {step === 2 && (
            <ExerciseCard exercise={exercise} onComplete={finish} />
          )}
        </>
      ) : (
        <div style={{
          border: `1px solid ${UI.line}`, borderRadius: UI.radius, padding: 18, background: UI.wash,
          boxShadow: `0 18px 50px ${UI.glow}`
        }}>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Portal complete.</div>
          <div style={{ color: UI.sub, fontSize: 14, marginBottom: 10 }}>
            Your shift is sealed. <b>Next unlock at 5:00 AM</b> ({timeUntilUnlockStr()}).
          </div>
          <div style={{ fontSize: 13, color: UI.muted, marginBottom: 2 }}>
            Today: {exercise.id} • Category {exercise.cat} • Felt shift {record?.shift ?? "—"}/10
          </div>
          {record?.checkin && (
            <div style={{
              marginTop: 10, padding: 12, border: `1px dashed ${UI.line}`, borderRadius: 12, background: "#fff"
            }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Your proof</div>
              <div style={{ fontSize: 14, color: UI.ink }}>{record.checkin}</div>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <button onClick={() => alert("See you at dawn. Keep your eyes open for 11:11 today.")}
              style={btnGhost({ fontWeight: 800 })}>
              Cosmic reminder set
            </button>
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 14, color: UI.muted, fontSize: 12 }}>
        One exercise. One seal. One shift. Return tomorrow at <b>5:00 AM</b>.
      </div>
    </div>
  );
}
