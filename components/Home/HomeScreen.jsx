import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { get, set } from "../../src/flowState";

// --- helpers already in your file ---
async function hydrateName() {
  try {
    const m = await import("../../src/userName");
    if (m && typeof m.hydrateFirstNameFromSupabase === "function") {
      await m.hydrateFirstNameFromSupabase();
    }
  } catch {}
}

const AGREEMENT_VERSION = "v1";
const AGREED_KEY = `mg_agreed_${AGREEMENT_VERSION}`;

// --- Pull normalized answers from flowState or localStorage
function readQuestionnaireAnswers() {
  try {
    // 1) from flowState if present
    const st = require("../../src/flowState");
    const cur = (st?.get && st.get()) || {};
    if (cur?.questionnaire?.answers) return cur.questionnaire.answers;
  } catch {}

  // 2) fallback: localStorage
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("questionnaire_answers");
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return null;
}

// --- Build a concise prompt string for chat
function makePromptFrom(answers) {
  if (!answers) return "";
  const { goal, blocker, timeframe, constraint, proof_line } = answers;
  return [
    goal ? `Goal: ${goal}` : null,
    blocker ? `Blocker: ${blocker}` : null,
    timeframe ? `Timeframe: ${timeframe}` : null,
    constraint ? `Constraint: ${constraint}` : null,
    proof_line ? `Proof target: ${proof_line}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function HomeScreen() {
  const router = useRouter();
  const [S, setS] = useState(get());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
const [hasAnswers, setHasAnswers] = useState(() => !!readQuestionnaireAnswers());

  const [checked, setChecked] = useState(false);
  const [agreedAt, setAgreedAt] = useState(
    typeof window !== "undefined" ? localStorage.getItem(AGREED_KEY) : null
  );

  // --- Name hydration ---
// --- Name hydration ---
useEffect(() => {
  let alive = true;
  (async () => {
    try {
      await hydrateName();

      if (typeof window !== "undefined") {
        const lsName = (localStorage.getItem("mg_first_name") || "").trim();
        if (lsName && (!get().firstName || get().firstName === "Friend")) {
          set({ firstName: lsName });
        }
      }

      if (alive) {
        setS(get());
        // also reflect current questionnaire state
        setHasAnswers(!!readQuestionnaireAnswers());
      }
    } catch (e) {
      if (alive) setErr("Could not load your profile. Showing default view.");
    } finally {
      if (alive) setLoading(false);
    }
  })();

  const onStorage = (e) => {
    if (e.key === "mg_first_name") {
      const val = (e.newValue || "").trim();
      if (val) set({ firstName: val });
      setS(get());
    }
    if (e.key === AGREED_KEY) setAgreedAt(e.newValue);
    if (e.key === "questionnaire_answers") {
      setHasAnswers(!!e.newValue);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    alive = false;
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}, []);


const onStorage = (e) => {
  if (e.key === "mg_first_name") {
    const val = (e.newValue || "").trim();
    if (val) set({ firstName: val });
    setS(get());
  }
  if (e.key === AGREED_KEY) setAgreedAt(e.newValue);
  if (e.key === "questionnaire_answers") {
    setHasAnswers(!!e.newValue);
  }
};


  const resolveFirstName = () => {
    const stateName = (S.firstName || "").trim();
    if (stateName && stateName !== "Friend") return stateName;
    if (typeof window !== "undefined") {
      const ls = (localStorage.getItem("mg_first_name") || "").trim();
      if (ls) return ls;
    }
    return "Friend";
  };
  const firstName = resolveFirstName();

  const acceptAgreement = async () => {
    const ts = new Date().toISOString();
    if (typeof window !== "undefined") localStorage.setItem(AGREED_KEY, ts);
    setAgreedAt(ts);
    set({ agreement: { version: AGREEMENT_VERSION, acceptedAt: ts } });
  };

  // friendly long date
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const startManifesting = () => {
  // 1) If we have answers, turn them into a prompt_spec right now
  const answers = readQuestionnaireAnswers();
  if (answers) {
    try {
      const prompt = makePromptFrom(answers);
      const cur = get() || {};
      set({
        ...cur,
        prompt_spec: {
          ...answers,
          prompt,
          savedAt: new Date().toISOString(),
        },
      });
    } catch (e) {
      console.warn("Could not persist prompt_spec from answers:", e);
    }
  }

  // 2) Continue your normal flow
  const cur = get();
  const hasVibe = !!(cur?.vibe && (cur.vibe.name || cur.vibe.id));
  router.push(hasVibe ? "/chat" : "/vibe");
};


  return (
    <main style={{ width: "min(900px, 94vw)", margin: "30px auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 12px" }}>
        👋 Hi {firstName}, welcome to the portal
      </h1>
      <p
        style={{
          marginTop: -6,
          marginBottom: 14,
          color: "rgba(0,0,0,.75)",
          lineHeight: 1.5,
        }}
      >
        If you’ve felt stuck before—working hard, juggling stress, or doubting yourself...
        Genie helps turn those <strong>old beliefs into breakthroughs</strong>, one day at a time.
      </p>

      <p className="text-sm text-black/60 h-5" aria-live="polite">
        {loading ? "Loading your profile…" : err ? err : ""}
      </p>

      <section
        style={{
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          padding: 12,
          background: "#fafafa",
        }}
      >
        {/* card 1 — Ethical Agreement */}
        <div
          style={{
            background: "white",
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
            Ethical agreement
          </div>

          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            <strong>Pinky promise:</strong> I use Manifestation Genie for good vibes only—uplifting
            myself and others. No harm, no coercion, no shady wishes. I own my choices. This is
            spiritual self-help, not medical, legal, or financial advice.
          </div>

          {agreedAt ? (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "#166534",
                background: "#dcfce7",
                border: "1px solid #86efac",
                borderRadius: 10,
                padding: "8px 10px",
                display: "inline-block",
              }}
            >
              Accepted {new Date(agreedAt).toLocaleString()} (version {AGREEMENT_VERSION})
            </div>
          ) : (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  aria-label="I agree to this statement"
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ fontSize: 14 }}>I agree to this statement</span>
              </label>

              <button
                onClick={acceptAgreement}
                disabled={!checked}
                aria-disabled={!checked}
                style={{
                  background: checked ? "#facc15" : "rgba(250, 204, 21, .6)",
                  border: `1px solid ${checked ? "#eab308" : "rgba(234, 179, 8, .6)"}`,
                  borderRadius: 10,
                  padding: "10px 16px",
                  fontWeight: 700,
                  cursor: checked ? "pointer" : "not-allowed",
                  minHeight: 44,
                  minWidth: 44,
                }}
              >
                I agree
              </button>
            </div>
          )}
        </div>

        {/* card 2 — Tip + CTA */}
        <div
          style={{
            marginTop: 12,
            background: "white",
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >


          <div style={{ marginTop: 14 }}>
            <button
              onClick={startManifesting}
              disabled={!agreedAt}
              aria-disabled={!agreedAt}
              style={{
                width: "100%",
                background: agreedAt ? "#facc15" : "rgba(250, 204, 21, .6)",
                border: `1px solid ${agreedAt ? "#eab308" : "rgba(234, 179, 8, .6)"}`,
                borderRadius: 12,
                padding: "14px 18px",
                fontWeight: 900,
                fontSize: 16,
                letterSpacing: 0.3,
                minHeight: 48,
                cursor: agreedAt ? "pointer" : "not-allowed",
              }}
              aria-label="Start Manifesting"
            >
              CLICK HERE TO START MANIFESTING »
            </button>

            {!agreedAt && (
              <p
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "#b91c1c",
                  textAlign: "center",
                }}
              >
                Please accept the agreement first ✨
              </p>
            )}
            {agreedAt && !hasAnswers && (
  <p
    style={{
      marginTop: 8,
      fontSize: 13,
      color: "#b91c1c",
      textAlign: "center",
    }}
    aria-live="polite"
  >
   </p>
)}

          </div>
        </div>
      </section>
    </main>
  );
}
