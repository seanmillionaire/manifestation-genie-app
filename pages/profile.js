// /pages/profile.js
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";

export default function ProfilePage() {
  const supabase = createBrowserSupabaseClient();

  const [user, setUser] = useState(null);
  const [streak, setStreak] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [lastDate, setLastDate] = useState(null);
  const [wishes, setWishes] = useState([]);
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase.auth.getUser();
      const u = data?.user || null;
      if (!alive) return;
      setUser(u);
      if (!u) { setLoading(false); return; }

      // 1) visits (last 60 days)
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const { data: visits = [] } = await supabase
        .from("user_daily_visits")
        .select("visit_date")
        .gte("visit_date", since.toISOString().slice(0, 10))
        .order("visit_date", { ascending: false });

      if (!alive) return;
      const { _streak, _weekCount, _last } = computeVisitStats(visits || []);
      setStreak(_streak);
      setWeekCount(_weekCount);
      setLastDate(_last);

      // 2) wishlist (view → fallback)
      let wl = [];
      const { data: wlView, error: wlErr } = await supabase
        .from("user_questionnaire_wishlist")
        .select("title, created_at")
        .order("created_at", { ascending: false });
      if (!wlErr && wlView) {
        wl = wlView;
      } else {
        const { data: wlTbl } = await supabase
          .from("wishes")
          .select("id, title, note, created_at")
          .order("created_at", { ascending: false });
        wl = wlTbl || [];
      }
      if (!alive) return;
      setWishes(wl);

      // 3) wins
      const { data: wn = [] } = await supabase
        .from("wins")
        .select("id, title, note, points, created_at")
        .order("created_at", { ascending: false });
      if (!alive) return;
      setWins(wn || []);
      setLoading(false);
    }
    load();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                <div style={subMeta}>
                  {w.created_at ? new Date(w.created_at).toLocaleDateString() : ""}
                </div>
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

/* ---------- small UI helpers to match your white design ---------- */

function PageWrap({ children }) {
  return (
    <div style={{ width: "min(1100px, 94vw)", margin: "18px auto 36px", padding: "0 2px" }}>
      {children}
    </div>
  );
}

function H1({ children }) {
  return <h1 style={{ fontSize: 28, fontWeight: 700, margin: "6px 0 6px" }}>{children}</h1>;
}

function H2({ children }) {
  return <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>{children}</h2>;
}

function Muted({ children }) {
  return <p style={{ color: "var(--muted)", marginTop: 0, marginBottom: 14 }}>{children}</p>;
}

function Card({ children }) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "14px 14px",
        margin: "14px 0",
        boxShadow: "0 1px 0 rgba(0,0,0,0.02)"
      }}
    >
      {children}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: 12,
      minHeight: 72
    }}>
      <div style={{ fontSize: 13, color: "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}

const grid3 = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12
};
// make it 3 columns on wide screens without Tailwind
if (typeof window !== "undefined") {
  const mql = window.matchMedia("(min-width: 720px)");
  if (mql.matches) grid3.gridTemplateColumns = "repeat(3, 1fr)";
}

const rowItem = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 12,
  marginTop: 8
};

const subMeta = { fontSize: 12, color: "var(--muted)", marginTop: 6 };
const finePrint = { fontSize: 12, color: "var(--muted)", marginTop: 10 };

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
