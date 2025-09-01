// components/Profile/ProfileScreen.jsx
import { useEffect, useState } from "react";

export default function ProfileScreen() {
  // name
  const [firstName, setFirstName] = useState("Friend");
  // vibe
  const [vibe, setVibe] = useState("—");
  // agreement
  const [acceptedAt, setAcceptedAt] = useState(null);

  // hydrate from localStorage (client-only)
  useEffect(() => {
    try {
      const n = localStorage.getItem("mg_first_name");
      if (n && n.trim()) setFirstName(n.trim());
    } catch {}
    try {
      const v = localStorage.getItem("mg_vibe");
      if (v && v.trim()) setVibe(v);
    } catch {}
    try {
      // current version key
      const a = localStorage.getItem("mg_agreed_v1");
      if (a) setAcceptedAt(a);
    } catch {}
  }, []);

  const acceptedLabel = acceptedAt ? new Date(acceptedAt).toLocaleString() : null;

  return (
    <main style={{ width: "min(900px, 94vw)", margin: "30px auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 12px" }}>
        Profile
      </h1>

      <p className="text-sm text-black/60 h-5" aria-live="polite">
        More coming soon!
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
          <div style={{ fontSize: 14 }}>{vibe}</div>
        </div>

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
