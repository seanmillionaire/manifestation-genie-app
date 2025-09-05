// /pages/index.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { get, set } from "../src/flowState";
import { hydrateFirstNameFromSupabase } from "../src/userName";
import { supabase } from "../src/supabaseClient";

const AGREEMENT_VERSION = "v1";

async function readAgreementFromServer() {
  try {
    const res = await fetch("/api/flags/get?key=agreement_v1");
    if (!res.ok) return null;
    const json = await res.json();
    return json?.value || null;
  } catch {
    return null;
  }
}

async function setAgreementOnServer() {
  try {
    await fetch("/api/flags/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "agreement_v1",
        value: { acceptedAt: new Date().toISOString(), version: AGREEMENT_VERSION },
      }),
    });
    return true;
  } catch {
    return false;
  }
}

// Pull normalized answers (we rely on flowState; no localStorage)
function readQuestionnaireAnswers() {
  try {
    const cur = get() || {};
    return cur?.questionnaire?.answers || null;
  } catch {
    return null;
  }
}

function makePromptFrom(answers) {
  if (!answers) return "";
  const { goal, blocker, timeframe, constraint, proof_line } = answers;
  return [
    goal ? `Goal: ${goal}` : null,
    blocker ? `Blocker: ${blocker}` : null,
    timeframe ? `Timeframe: ${timeframe}` : null,
    constraint ? `Constraint: ${constraint}` : null,
    proof_line ? `Proof target: ${proof_line}` : null,
  ].filter(Boolean).join("\n");
}

export default function HomeScreen() {
  const router = useRouter();
  const [S, setS] = useState(get());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [hasAnswers, setHasAnswers] = useState(() => !!readQuestionnaireAnswers());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // ensure session exists (optional check)
        await supabase.auth.getSession();

        // hydrate first name from Supabase
        await hydrateFirstNameFromSupabase();

        // load agreement flag from server (Supabase)
        const a = await readAgreementFromServer();
        if (alive) setAgreed(!!a);

        // reflect questionnaire
        if (alive) setHasAnswers(!!readQuestionnaireAnswers());

        if (alive) setS(get());
      } catch (e) {
        if (alive) setErr("Could not load your profile. Showing default view.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const firstName = (() => {
    const n = (S.firstName || "").trim();
    return n && n !== "Friend" ? n : "Friend";
  })();

  const acceptAgreement = async () => {
    const ok = await setAgreementOnServer();
    if (ok) {
      setAgreed(true);
      set({ ...get(), agreement: { version: AGREEMENT_VERSION, accepted: true } });
    }
  };

  const startManifesting = () => {
    // If we have answers, persist prompt_spec in flowState (memory)
    const answers = readQuestionnaireAnswers();
    if (answers) {
      const prompt = makePromptFrom(answers);
      const cur = get() || {};
      set({
        ...cur,
        prompt_spec: { ...answers, prompt, savedAt: new Date().toISOString() },
      });
    }
    const cur = get();
    const hasVibe = !!(cur?.vibe && (cur.vibe.name || cur.vibe.id));
    router.push(hasVibe ? "/chat" : "/vibe");
  };

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <main style={{ width: "min(900px, 94vw)", margin: "30px auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 12px" }}>
        👋 Welcome home, {firstName}.
      </h1>
      <p style={{ marginTop: -6, marginBottom: 14, color: "rgba(0,0,0,.75)", lineHeight: 1.5 }}>
        It’s {today}. One small aligned step today → outsized momentum tomorrow.
      </p>

      <p className="text-sm text-black/60 h-5" aria-live="polite">
        {loading ? "Loading your profile…" : err ? err : ""}
      </p>

      <section style={{
        border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 12, background: "#fafafa",
      }}>
        <div style={{
          background: "white", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 12, padding: "14px 16px",
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Ethical agreement</div>
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            <strong>Pinky promise:</strong> Kindness only. This is spiritual self-help, not medical,
            legal, or financial advice. I own my choices and use Genie to uplift myself and others.
          </div>

          {agreed ? (
            <div style={{
              marginTop: 10, fontSize: 12, color: "#166534", background: "#dcfce7",
              border: "1px solid #86efac", borderRadius: 10, padding: "8px 10px", display: "inline-block",
            }}>
              Agreement accepted (version {AGREEMENT_VERSION})
            </div>
          ) : (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
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
                  minHeight: 44, minWidth: 44,
                }}
              >
                I agree
              </button>
            </div>
          )}
        </div>

        <div style={{
          marginTop: 12, background: "white", border: "1px solid rgba(0,0,0,0.10)",
          borderRadius: 12, padding: "14px 16px",
        }}>
          <div style={{ marginTop: 14 }}>
            <button
              onClick={startManifesting}
              disabled={!agreed}
              aria-disabled={!agreed}
              style={{
                width: "100%",
                background: agreed ? "#facc15" : "rgba(250, 204, 21, .6)",
                border: `1px solid ${agreed ? "#eab308" : "rgba(234, 179, 8, .6)"}`,
                borderRadius: 12, padding: "14px 18px",
                fontWeight: 900, fontSize: 16, letterSpacing: 0.3, minHeight: 48,
                cursor: agreed ? "pointer" : "not-allowed",
              }}
              aria-label="Start Manifesting"
            >
              CLICK HERE TO START MANIFESTING »
            </button>
            {!agreed && (
              <p style={{ marginTop: 8, fontSize: 13, color: "#b91c1c", textAlign: "center" }}>
                Please accept the agreement first ✨
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
