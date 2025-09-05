// /pages/profile.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient"; // or "../src/supabaseClient" if that's your path

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [streak, setStreak] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [lastDate, setLastDate] = useState(null);
  const [wishes, setWishes] = useState([]);
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true); // gate UI until done

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        // 0) session
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) console.error("getSession error:", sessErr);
        const u = session?.user ?? null;
        if (!alive) return;
        setUser(u);

        if (!u) return; // not signed in -> we’ll show the sign-in card below

        // 1) visits (last 60 days)
        const since = new Date();
        since.setDate(since.getDate() - 60);
        const { data: visits, error: vErr } = await supabase
          .from("user_daily_visits")
          .select("visit_date")
          .gte("visit_date", since.toISOString().slice(0, 10))
          .order("visit_date", { ascending: false });

        if (vErr) console.error("visits error:", vErr);
        const safeVisits = Array.isArray(visits) ? visits : [];
        const { _streak, _weekCount, _last } = computeVisitStats(safeVisits);
        if (!alive) return;
        setStreak(_streak);
        setWeekCount(_weekCount);
        setLastDate(_last);

        // 2) wishlist (view → table), filter to me
        let wl = [];
        const { data: wlView, error: wlErr } = await supabase
          .from("user_questionnaire_wishlist")
          .select("user_id, title, created_at")
          .eq("user_id", u.id)
          .order("created_at", { ascending: false });

        if (wlErr) {
          // view may not exist — that’s ok
          console.warn("wishlist view error:", wlErr?.code, wlErr?.message);
          const { data: wlTbl, error: wlTblErr } = await supabase
            .from("wishes")
            .select("id, title, note, created_at")
            .eq("user_id", u.id)
            .order("created_at", { ascending: false });
          if (wlTblErr) console.error("wishes table error:", wlTblErr);
          wl = wlTbl || [];
        } else {
          wl = wlView || [];
        }
        if (!alive) return;
        setWishes(wl);

        // 3) wins (filter to me)
        const { data: wn, error: winsErr } = await supabase
          .from("wins")
          .select("id, title, note, points, created_at")
          .eq("user_id", u.id)
          .order("created_at", { ascending: false });

        if (winsErr) console.error("wins error:", winsErr);
        if (!alive) return;
        setWins(wn || []);
      } catch (e) {
        console.error("Profile load fatal:", e);
      } finally {
        if (alive) setLoading(false); // <-- ALWAYS clear loading
      }
    }

    load();
    return () => { alive = false; };
  }, []);

  // Loading gate
  if (loading) {
    return (
      <PageWrap>
        <H1>Your Profile</H1>
        <Muted>This is your personal dashboard</Muted>
        <Card><Muted>Loading…</Muted></Card>
      </PageWrap>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <PageWrap>
        <H1>Your Profile</H1>
        <Muted>This is your personal dashboard</Muted>
        <Card><Muted>Please sign in.</Muted></Card>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <H1>Your Profile</H1>
      <Muted>This is your personal dashboard</Muted>

      {/* PROGRESS */}
      <Card>
        <H2>Progress</H2>
        <div style={grid3}>
          <Stat label="Current streak" value={`${streak} day${streak === 1 ? "" : "s"}`} />
          <Stat label="Sessions this week" value={weekCount} />
          <Stat label="Last session" value={lastDate ? new Date(lastDate).toLocaleDateString() : "—"} />
        </div>
        <p style={finePrint} aria-live="polite">
          Opening the app while signed in counts automatically.
        </p>
      </Card>

      {/* MANIFESTATION LIST */}
      <Card>
        <H2>Manifestation list</H2>
        {wishes.length === 0 ? (
          <Muted>Your questionnaire wishes will show here.</Muted>
        ) : (
          <ul style={{ marginTop: 8, padding: 0, listStyle: "none" }}>
            {wishes.map((w, i) => (
              <li key={w.id ?? w.title ?? i} style={rowItem}>
                <div style={{ fontWeight: 600 }}>{w.title}</div>
                <div style={subMeta}>{w.created_at ? new Date(w.created_at).toLocaleDateString() : ""}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* WINS */}
      <Card>
        <H2>Wins</H2>
        {wins.length === 0 ? (
          <Muted>No wins yet — keep chatting with Genie to earn points.</Muted>
        ) : (
          <ul style={{ marginTop: 8, padding: 0, listStyle: "none" }}>
            {wins.map((w) => (
              <li key={w.id} style={rowItem}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 600 }}>{w.title}</div>
                  <div style={{ fontSize: 14 }}>+{w.points ?? 0} pts</div>
                </div>
                {w.note && <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 6 }}>{w.note}</div>}
                <div style={subMeta}>{new Date(w.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageWrap>
  );
}

/* ---------- small UI helpers ---------- */

function PageWrap({ children }) {
  return (
    <div style={{ width: "min(1100px, 94vw)", margin: "32px auto 48px", padding: "0 4px" }}>
      {children}
    </div>
  );
}
function H1({ children }) {
  return <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 6px", color: "var(--text)" }}>{children}</h1>;
}
function H2({ children }) {
  return <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 12px", color: "var(--text)" }}>{children}</h2>;
}
function Muted({ children }) {
  return <p style={{ color: "var(--muted)", margin: "4px 0 16px", fontSize: 15 }}>{children}</p>;
}
function Card({ children }) {
  return (
    <section style={{
      background: "#fff",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "18px 20px",
      margin: "20px 0",
      boxShadow: "0 2px 4px rgba(0,0,0,0.04)"
    }}>
      {children}
    </section>
  );
}
function Stat({ label, value }) {
  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "14px 16px",
      minHeight: 80,
      background: "var(--soft)"
    }}>
      <div style={{ fontSize: 14, color: "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: "var(--text)" }}>{value}</div>
    </div>
  );
}

const grid3 = { display: "grid", gridTemplateColumns: "1fr", gap: 16 };
if (typeof window !== "undefined") {
  const mql = window.matchMedia("(min-width: 720px)");
  if (mql.matches) grid3.gridTemplateColumns = "repeat(3, 1fr)";
}
const rowItem = { border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginTop: 10, background: "var(--soft)" };
const subMeta = { fontSize: 13, color: "var(--muted)", marginTop: 6 };
const finePrint = { fontSize: 13, color: "var(--muted)", marginTop: 12 };

/* ---------- logic helpers ---------- */
function computeVisitStats(visits) {
  const set = new Set((visits || []).map((v) => v.visit_date));
  let _streak = 0;
  const d = new Date();
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    _streak += 1;
    d.setDate(d.getDate() - 1);
  }
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay()); // Sunday
  const weekKey = start.toISOString().slice(0, 10);
  const _weekCount = (visits || []).filter((v) => v.visit_date >= weekKey).length;
  const _last = (visits || [])[0]?.visit_date ?? null;
  return { _streak, _weekCount, _last };
}
