// components/Profile/ProfileScreen.jsx
import { useEffect, useState } from "react";
import { get, set } from "../../src/flowState";

const AGREEMENT_VERSION = "v1";
const AGREED_KEY = `mg_agreed_${AGREEMENT_VERSION}`;

async function hydrateNameFromSupabaseSafe() {
  try {
    const m = await import("../../src/userName");
    if (m && typeof m.hydrateFirstNameFromSupabase === "function") {
      await m.hydrateFirstNameFromSupabase();
    }
  } catch {
    // ignore
  }
}

function safeDateLabel(iso) {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

export default function ProfileScreen() {
  // 1) render nothing until we're mounted on the client
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // 2) local state snapshot (don’t read localStorage in render)
  const [S, setS] = useState(get());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [agreedAt, setAgreedAt] = useState(null);

  // 3) hydrate from store/localStorage/supabase on mount
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // localStorage: agreement time
        try {
          const val = localStorage.getItem(AGREED_KEY);
          if (val) setAgreedAt(val);
        } catch {}

        // name: prefer store; if missing, try localStorage then supabase
        let cur = get();
        if (!cur.firstName || cur.firstName === "Friend") {
          try {
            const ls = (localStorage.getItem("mg_first_name") || "").trim();
            if (ls && ls !== "Friend") set({ firstName: ls });
          } catch {}
          cur = get();
          if (!cur.firstName || cur.firstName === "Friend") {
            await hydrateNameFromSupabaseSafe();
          }
        }

        if (alive) setS(get());
      } catch {
        if (alive) setErr("Could not load your profile. Showing default view.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    // keep in sync with other tabs
    function onStorage(e) {
      if (e.key === "mg_first_name") setS(get());
      if (e.key === AGREED_KEY) setAgreedAt(e.newValue);
    }
    window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const firstName = (S.firstName && S.firstName !== "Friend") ? S.firstName : "Friend";
  const vibe  = S?.vibe?.name || S?.vibe || "—";
  const wish  = S?.currentWish?.wish  || "—";
  const block = S?.currentWish?.block || "—";
  const micro = S?.currentWish?.micro || "—";

  const acceptedIso = agreedAt || S?.agreement?.acceptedAt || null;
  const acceptedLabel = safeDateLabel(acceptedIso);

  async function refreshFromSupabase() {
    setLoading(true);
    await hydrateNameFromSupabaseSafe();
    setS(get());
    setLoading(false);
  }

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
            <div><strong>Name:</strong> {firstName}</div>
            <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={refreshFromSupabase}
                style={{
                  background: "white",
                  border: "1px solid rgba(0,0,0,0.20)",
                  borderRadius: 10,
                  padding: "10px 16px",
                  fontWeight: 700,
                  minHeight: 44,
                  minWidth: 44,
                  cursor: "pointer",
                }}
                title="Re-sync name from Supabase"
              >
                Refresh from Supabase
              </button>
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
          <div style={{ fontSize: 14 }}>{vibe}</div>
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
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            <div><strong>Wish:</strong> {wish}</div>
            <div><strong>Block:</strong> {block}</div>
            <div><strong>Micro-step:</strong> {micro}</div>
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
