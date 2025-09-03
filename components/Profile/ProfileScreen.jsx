// components/Profile/ProfileScreen.jsx
import { useEffect, useState } from "react";

export default function ProfileScreen() {
  // name
  const [firstName, setFirstName] = useState("Friend");
  // vibe
  const [vibe, setVibe] = useState("—");
  // agreement
  const [acceptedAt, setAcceptedAt] = useState(null);

  function safeParse(json) {
    try { return JSON.parse(json); } catch { return null; }
  }

  // hydrate from localStorage (client-only)
  useEffect(() => {
    // name
    try {
      const n = localStorage.getItem("mg_first_name");
      if (n && n.trim()) setFirstName(n.trim());
    } catch {}

    // vibe (handle multiple possible shapes/keys)
    try {
      // 1) explicit string name
      const vName = localStorage.getItem("mg_vibe_name");
      if (vName && vName.trim()) {
        setVibe(vName.trim());
      } else {
        // 2) mg_vibe could be a string OR JSON object
        const raw = localStorage.getItem("mg_vibe");
        if (raw && raw.trim()) {
          if (raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
            const obj = safeParse(raw);
            const best =
              obj?.name ||
              obj?.label ||
              obj?.id ||
              (typeof obj === "string" ? obj : null);
            if (best) setVibe(String(best));
          } else {
            setVibe(raw.trim());
          }
        } else {
          // 3) sometimes vibe is tucked into currentWish
          const cw = localStorage.getItem("mg_current_wish");
          if (cw) {
            const obj = safeParse(cw);
            const best =
              obj?.vibe?.name ||
              obj?.vibe?.label ||
              obj?.vibe?.id ||
              (typeof obj?.vibe === "string" ? obj.vibe : null);
            if (best) setVibe(String(best));
          }
        }
      }
    } catch {}

    // agreement
    try {
      const a = localStorage.getItem("mg_agreed_v1"); // current version key
      if (a) setAcceptedAt(a);
    } catch {}
  }, []);

  const acceptedLabel = acceptedAt ? new Date(acceptedAt).toLocaleString() : null;

  return (
    <main style={{ width: "min(900px, 94vw)", margin: "30px auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 12px" }}>
        Your Profile
      </h1>

      <p className="text-sm text-black/60 h-5" aria-live="polite">
        This is your personal dashboard
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
          <div style={{ fontSize: 14 }}>{vibe || "—"}</div>
        </div>

        {/* Progress (unchanged if you already added it elsewhere) */}
        {/* Ethical agreement */}
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
              Accepted {acceptedLabel} (version v1)
            </div>
          ) : (
            <div style={{ fontSize: 14 }}>—</div>
          )}
        </div>
      </section>
    </main>
  );
}
