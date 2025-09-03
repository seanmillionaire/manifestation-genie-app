// components/Profile/ProfileScreen.jsx
import { useEffect, useMemo, useState } from "react";

// ---- localStorage helpers (safe) ----
function lsGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    if (/^\s*[\[{]/.test(raw)) return JSON.parse(raw);
    return raw;
  } catch {
    return fallback;
  }
}
function lsSet(key, val) {
  try {
    const v = typeof val === "string" ? val : JSON.stringify(val);
    localStorage.setItem(key, v);
  } catch {}
}
function todayStr(d = new Date()) {
  // YYYY-MM-DD in local time
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function daysBetween(a, b) {
  const MS = 24 * 60 * 60 * 1000;
  return Math.floor((b - a) / MS);
}
function isSameDayISO(isoA, isoB) {
  return (isoA || "").slice(0, 10) === (isoB || "").slice(0, 10);
}

// Compute current streak from a set of YYYY-MM-DD strings
function computeStreak(daySet) {
  if (!daySet || daySet.size === 0) return 0;
  let streak = 0;
  const now = new Date();
  // Walk backwards from today until a gap
  for (let offset = 0; ; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    const key = todayStr(d);
    if (daySet.has(key)) streak++;
    else break;
  }
  return streak;
}

// Sessions this week (Mon-Sun)
function sessionsThisWeek(daySet) {
  if (!daySet || daySet.size === 0) return 0;
  const now = new Date();
  const day = now.getDay(); // 0=Sun..6=Sat
  const mondayOffset = (day + 6) % 7; // days since Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    if (daySet.has(todayStr(d))) count++;
  }
  return count;
}

export default function ProfileScreen() {
  // Core basics (baseline kept)
  const [firstName, setFirstName] = useState("Friend");
  const [vibe, setVibe] = useState("—");
  const [acceptedAt, setAcceptedAt] = useState(null);

  // Progress + logs
  const [sessionDays, setSessionDays] = useState([]); // array of YYYY-MM-DD
  const [lastSessionISO, setLastSessionISO] = useState(null); // ISO string
  const [sessionsTotal, setSessionsTotal] = useState(0);

  // Lists
  const [manifestations, setManifestations] = useState([]); // [{wish, block, micro, date}]
  const [wins, setWins] = useState([]); // [{title, note, date}]

  // Quick add inputs (client-side only UI)
  const [newWish, setNewWish] = useState("");
  const [newWinTitle, setNewWinTitle] = useState("");
  const [newWinNote, setNewWinNote] = useState("");

  // Hydrate from localStorage
  useEffect(() => {
    setFirstName(lsGet("mg_first_name", "Friend") || "Friend");
    setVibe(lsGet("mg_vibe", "—") || "—");
    setAcceptedAt(lsGet("mg_agreed_v1", null));

    setManifestations(lsGet("mg_manifestations", []) || []);
    setWins(lsGet("mg_wins", []) || []);

    const days = lsGet("mg_session_days", []) || [];
    setSessionDays(Array.isArray(days) ? days : []);

    setLastSessionISO(lsGet("mg_last_session_iso", null));
    setSessionsTotal(Number(lsGet("mg_sessions_total", 0)) || 0);
  }, []);

  // Derived progress
  const daySet = useMemo(() => new Set(sessionDays || []), [sessionDays]);
  const streak = useMemo(() => computeStreak(daySet), [daySet]);
  const thisWeek = useMemo(() => sessionsThisWeek(daySet), [daySet]);
  const lastSessionLabel = useMemo(() => {
    if (!lastSessionISO) return "—";
    try {
      const d = new Date(lastSessionISO);
      const diff = daysBetween(d, new Date());
      if (diff === 0) return "Today";
      if (diff === 1) return "Yesterday";
      return `${diff} days ago`;
    } catch {
      return "—";
    }
  }, [lastSessionISO]);

  // Mark today complete (optional, just local)
  function markTodayComplete() {
    const t = todayStr();
    if (!daySet.has(t)) {
      const next = [...daySet, t];
      lsSet("mg_session_days", next);
      setSessionDays(next);
      const newTotal = sessionsTotal + 1;
      setSessionsTotal(newTotal);
      lsSet("mg_sessions_total", newTotal);
    }
    const nowISO = new Date().toISOString();
    setLastSessionISO(nowISO);
    lsSet("mg_last_session_iso", nowISO);
  }

  // Add manifestation
  function addManifestation() {
    const w = newWish.trim();
    if (!w) return;
    const item = {
      wish: w,
      block: "",
      micro: "",
      date: todayStr(),
    };
    const next = [item, ...(manifestations || [])].slice(0, 20);
    setManifestations(next);
    lsSet("mg_manifestations", next);
    setNewWish("");
  }

  // Add win
  function addWin() {
    const t = newWinTitle.trim();
    if (!t) return;
    const item = {
      title: t,
      note: newWinNote.trim(),
      date: todayStr(),
    };
    const next = [item, ...(wins || [])].slice(0, 30);
    setWins(next);
    lsSet("mg_wins", next);
    setNewWinTitle("");
    setNewWinNote("");
  }

  const acceptedLabel = acceptedAt ? new Date(acceptedAt).toLocaleString() : null;

  return (
    <main style={{ width: "min(900px, 94vw)", margin: "30px auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 12px" }}>Your Profile</h1>
      <p className="text-sm text-black/60 h-5" aria-live="polite">This is your personal dashboard</p>

      {/* ===== Overview / Progress ===== */}
      <section
        style={{
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          padding: 12,
          background: "#fafafa",
          marginBottom: 14,
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
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}></div>
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            <div><strong>Name:</strong> {firstName}</div>
          </div>
        </div>

  

        {/* Progress tracker */}
        <div
          style={{
            background: "white",
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>Progress</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Current streak</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{streak} day{streak === 1 ? "" : "s"}</div>
            </div>
            <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Sessions this week</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{thisWeek}</div>
            </div>
            <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Last session</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{lastSessionLabel}</div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <button
              onClick={markTodayComplete}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "#ffd600",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Mark today complete ⭐️
            </button>
            <span style={{ marginLeft: 10, fontSize: 12, opacity: 0.7 }}>
              Total sessions: {sessionsTotal}
            </span>
          </div>
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
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Ethical agreement</div>
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

      {/* ===== Manifestations ===== */}
      <section
        style={{
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          padding: 12,
          background: "#fafafa",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Manifestation list</div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            value={newWish}
            onChange={(e) => setNewWish(e.target.value)}
            placeholder="Add a new intention…"
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              fontSize: 14,
            }}
          />
          <button
            onClick={addManifestation}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>

        {manifestations?.length ? (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {manifestations.map((m, i) => (
              <li
                key={i}
                style={{
                  background: "white",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontWeight: 700 }}>{m.wish || "—"}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {m.date ? `Added ${m.date}` : ""}
                </div>
                {(m.block || m.micro) && (
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    {m.block ? <><strong>Block:</strong> {m.block} · </> : null}
                    {m.micro ? <><strong>Micro:</strong> {m.micro}</> : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ fontSize: 14, opacity: 0.7 }}>No intentions logged yet.</div>
        )}
      </section>

      {/* ===== Wins ===== */}
      <section
        style={{
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          padding: 12,
          background: "#fafafa",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Wins</div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr auto", gap: 8, marginBottom: 10 }}>
          <input
            value={newWinTitle}
            onChange={(e) => setNewWinTitle(e.target.value)}
            placeholder="Title (e.g., Finished the pitch deck)"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              fontSize: 14,
            }}
          />
          <input
            value={newWinNote}
            onChange={(e) => setNewWinNote(e.target.value)}
            placeholder="Optional note…"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              fontSize: 14,
            }}
          />
          <button
            onClick={addWin}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>

        {wins?.length ? (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {wins.map((w, i) => (
              <li
                key={i}
                style={{
                  background: "white",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontWeight: 700 }}>{w.title || "—"}</div>
                {w.note ? <div style={{ fontSize: 13, marginTop: 2 }}>{w.note}</div> : null}
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                  {w.date ? `Logged ${w.date}` : ""}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ fontSize: 14, opacity: 0.7 }}>No wins yet. Celebrate a tiny one today.</div>
        )}
      </section>
    </main>
  );
}
