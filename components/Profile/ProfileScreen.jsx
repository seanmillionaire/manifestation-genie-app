// components/Profile/ProfileScreen.jsx
import { useEffect, useState } from "react";
import { get, set } from "../../src/flowState";

const AGREEMENT_VERSION = "v1";
const AGREED_KEY = `mg_agreed_${AGREEMENT_VERSION}`;

async function hydrateName() {
  try {
    const m = await import("../../src/userName"); // { hydrateFirstNameFromSupabase }
    if (m && typeof m.hydrateFirstNameFromSupabase === "function") {
      await m.hydrateFirstNameFromSupabase();
    }
  } catch {
    // ignore — we'll show a friendly fallback
  }
}

export default function ProfileScreen() {
  const [S, setS] = useState(get());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [agreedAt, setAgreedAt] = useState(
    typeof window !== "undefined" ? localStorage.getItem(AGREED_KEY) : null
  );

  // hydrate like Home/Chat
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

    // keep in sync with other tabs/sections
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
  const vibe = S.vibe || "—";
  const wish = S.currentWish?.wish || "—";
  const block = S.currentWish?.block || "—";
  const micro = S.currentWish?.micro || "—";
  const storeAgreement = S.agreement || null;
  const acceptedIso = agreedAt || storeAgreement?.acceptedAt || null;

  const refreshFromSupabase = async () => {
    setLoading(true);
    await hydrateName();
    setS(get());
    setLoading(false);
  };

  return (
    <main style={{ width: "min(900px, 94vw)", margin: "30px auto" }}>
      {/* same header sizing as chat/home */}
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 12px" }}>
        Profile, {firstName}
      </h1>

      <p className="text-sm text-black/60 h-5" aria-live="polite">
        {loading ? "Loading your profile…" : err ? err : ""}
      </p>

      {/* outer console container (matches chat look) */}
      <section
        style={{
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          padding: 12,
          background: "#fafafa",
        }}
      >
        {/* Card: Identity */}
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

        {/* Card: Current Vibe */}
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

        {/* Card: Current Wish */}
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

        {/* Card: Agreement */}
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
          {acceptedIso ? (
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
              Accepted {new Date(acceptedIso).toLocaleString()} (version {AGREEMENT_VERSION})
            </div>
          ) : (
            <div style={{ fontSize: 14 }}>Not accepted yet on this version.</div>
          )}
        </div>
      </section>
    </main>
  );
}
