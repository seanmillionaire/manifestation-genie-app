// components/Profile/ProfileScreen.jsx
import { useEffect, useState } from "react";

/**
 * SUPER SAFE PROFILE
 * - No external app imports
 * - Never reads localStorage during SSR render
 * - Guards *everything* so it cannot crash
 */

const AGREEMENT_VERSION = "v1";
const AGREED_KEY = `mg_agreed_${AGREEMENT_VERSION}`;

function safeText(val) {
  if (val == null) return "—";
  const t = typeof val;
  if (t === "string" || t === "number" || t === "boolean") return String(val);
  if (t === "object") {
    try {
      if ("name" in val && (typeof val.name === "string" || typeof val.name === "number")) {
        return String(val.name);
      }
      return JSON.stringify(val);
    } catch {
      return "—";
    }
  }
  return "—";
}

function safeParseJSON(s, fallback) {
  if (!s || typeof s !== "string") return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

function safeDateLabel(iso) {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

export default function ProfileScreen() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [state, setState] = useState({
    firstName: "Friend",
    vibe: null,
    currentWish: { wish: null, block: null, micro: null },
    agreement: { acceptedAt: null, version: AGREEMENT_VERSION },
  });

  useEffect(() => setMounted(true), []);
  if (!mounted) return null; // never render on server

  // Hydrate only on client
  useEffect(() => {
    let done = false;
    (async () => {
      try {
        // Everything wrapped so a single bad key can't crash
        const firstName =
          (typeof window !== "undefined" && localStorage.getItem("mg_first_name")) ||
          "Friend";

        const vibe =
          (typeof window !== "undefined" && localStorage.getItem("mg_vibe")) || null;

        const currentWish =
          (typeof window !== "undefined" &&
            safeParseJSON(localStorage.getItem("mg_current_wish"), {
              wish: null,
              block: null,
              micro: null,
            })) || { wish: null, block: null, micro: null };

        const agreedAt =
          (typeof window !== "undefined" && localStorage.getItem(AGREED_KEY)) || null;

        setState({
          firstName,
          vibe,
          currentWish,
          agreement: { acceptedAt: agreedAt, version: AGREEMENT_VERSION },
        });
      } catch (e) {
        console.error("Profile hydrate error:", e);
        setErr("Could not load saved profile. Showing defaults.");
      } finally {
        if (!done) setLoading(false);
      }
    })();
    return () => {
      done = true;
    };
  }, []);

  const firstName = safeText(state.firstName);
  const vibeLabel = safeText(state.vibe);
  const wish = safeText(state.currentWish?.wish);
  const block = safeText(state.currentWish?.block);
  const micro = safeText(state.currentWish?.micro);

  const acceptedIso =
    state.agreement?.acceptedAt ? String(state.agreement.acceptedAt) : null;
  const acceptedLabel = safeDateLabel(acceptedIso);

  return (
    <main style={{ width: "min(900px, 94vw)", margin: "30px auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 12px" }}>
        Profile, {firstName}
      </h1>

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
        {/* Your info */}
        <div
          style={{
            background: "white",
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
            Your info
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            <div>
              <strong>Name:</strong> {firstName}
            </div>
          </div>
        </div>

        {/* Current vibe */}
        <div
          style={{
            background: "white",
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
            Current vibe
          </div>
          <div style={{ fontSize: 14 }}>{vibeLabel}</div>
        </div>

        {/* Current wish */}
        <div
          style={{
            background: "white",
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
            Current wish
          </div>
          <div>
            <strong>Wish:</strong> {wish}
          </div>
          <div>
            <strong>Block:</strong> {block}
          </div>
          <div>
            <strong>Micro-step:</strong> {micro}
          </div>
        </div>

        {/* Agreement */}
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
          {acceptedLabel ? (
            <div
              style={{
                fontSize: 12,
                color: "#166534",
                background: "#dcfce7",
                border: "1px solid #86efac",
                borderRadius: 10,
                padding: "8px 10px",
                display: "inline-block",
              }}
            >
              Accepted {acceptedLabel} (version {AGREEMENT_VERSION})
            </div>
          ) : (
            <div style={{ fontSize: 14 }}>Not accepted yet on this version.</div>
          )}
        </div>
      </section>
    </main>
  );
}
