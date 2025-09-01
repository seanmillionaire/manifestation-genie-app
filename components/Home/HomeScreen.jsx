import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { get, set } from "../../src/flowState";

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

export default function HomeScreen() {
  const router = useRouter();
  const [S, setS] = useState(get());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [checked, setChecked] = useState(false);
  const [agreedAt, setAgreedAt] = useState(
    typeof window !== "undefined" ? localStorage.getItem(AGREED_KEY) : null
  );

  // hydrate name exactly like Chat
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cur = get();
        if (!cur.firstName || cur.firstName === "Friend") {
          await hydrateName();
        }
        if (alive) setS(get());
      } catch (e) {
        if (alive) setErr("Could not load your profile. Showing default view.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const onStorage = (e) => {
      if (e.key === "mg_first_name") setS(get());
      if (e.key === AGREED_KEY) setAgreedAt(e.newValue);
    };
    if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
    };
  }, []);

  const firstName = S.firstName || "Friend";

  const acceptAgreement = async () => {
    const ts = new Date().toISOString();
    if (typeof window !== "undefined") localStorage.setItem(AGREED_KEY, ts);
    setAgreedAt(ts);
    set({ agreement: { version: AGREEMENT_VERSION, acceptedAt: ts } });
  };

  // friendly long date, e.g. "Monday, September 1, 2025"
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // one-button start: if no vibe yet -> pick vibe, else -> chat
  const startManifesting = () => {
    const cur = get();
    const hasVibe = !!(cur?.vibe && (cur.vibe.name || cur.vibe.id));
    router.push(hasVibe ? "/chat" : "/vibe");
  };

  return (
    <main style={{ width: "min(900px, 94vw)", margin: "30px auto" }}>
      {/* === MATCH CHAT HEADER === */}
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 12px" }}>
        Genie Chat, {firstName}
      </h1>

      {/* tiny status line like Chat uses subtle text */}
      <p className="text-sm text-black/60 h-5" aria-live="polite">
        {loading ? "Loading your profile…" : err ? err : ""}
      </p>

      {/* === MATCH CHAT CONSOLE PANEL === */}
      <section
        style={{
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          padding: 12,
          background: "#fafafa",
        }}
      >
        {/* card 1 — Ethical Agreement (prefame + crystal clear) */}
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

          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
            I use Manifestation Genie as a positive focusing tool. I take
            responsibility for my intentions and direct them toward my highest
            good and the well-being of others. I understand this is
            educational/spiritual guidance and not medical, legal, or
            financial advice.
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
                style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}
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

        {/* card 2 — One Super Tip + One Big CTA */}
        <div
          style={{
            marginTop: 12,
            background: "white",
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
            {firstName}&apos;s manifestation technique for {today}
          </div>

          {/* single super download from the cosmos */}
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            <strong>3-Breath Quantum Lock-In:</strong> Close your eyes. On each
            inhale, feel your desired reality already true. On each exhale,
            softly say (in present tense): <em>“It’s done. I am {`{your result}`} now.
            Thank you.”</em> Do three slow cycles, then open your eyes and take
            one tiny action that matches this reality within the next 60 minutes.
          </div>

          <div style={{ marginTop: 14 }}>
            <button
              onClick={startManifesting}
              style={{
                width: "100%",
                background: "#facc15",
                border: "1px solid #eab308",
                borderRadius: 12,
                padding: "14px 18px",
                fontWeight: 900,
                fontSize: 16,
                letterSpacing: 0.3,
                minHeight: 48,
                cursor: "pointer",
              }}
              aria-label="Start Manifesting"
            >
              START MANIFESTING &raquo;
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
