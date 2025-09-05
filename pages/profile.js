import { useEffect, useState } from "react";
import supabase from "../src/supabaseClient";


export default function ProfilePage() {
  const user = useUser();
  const supabase = useSupabaseClient();

  const [streak, setStreak] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [lastDate, setLastDate] = useState(null);
  const [wishes, setWishes] = useState([]);
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!user?.id) return;
      try {
        // 1) VISITS (last 60 days)
        const since = new Date();
        since.setDate(since.getDate() - 60);
        const { data: visits = [] } = await supabase
          .from("user_daily_visits")
          .select("visit_date")
          .gte("visit_date", since.toISOString().slice(0, 10))
          .order("visit_date", { ascending: false });

        if (!alive) return;
        const { streak, weekCount, last } = computeVisitStats(visits || []);
        setStreak(streak);
        setWeekCount(weekCount);
        setLastDate(last);

        // 2) WISHLIST — try questionnaire view first; if not present, fall back to "wishes" table
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

        // 3) WINS
        const { data: wn = [] } = await supabase
          .from("wins")
          .select("id, title, note, points, created_at")
          .order("created_at", { ascending: false });
        if (!alive) return;
        setWins(wn || []);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [user?.id, supabase]);

  if (!user) return <div className="p-6 text-lg">Please sign in.</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-1">Your Profile</h1>
      <p className="text-gray-600 mb-6">This is your personal dashboard</p>

      {/* PROGRESS */}
      <Section title="Progress">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Current streak" value={`${streak} day${streak === 1 ? "" : "s"}`} />
          <Stat label="Sessions this week" value={weekCount} />
          <Stat label="Last session" value={lastDate ? new Date(lastDate).toLocaleDateString() : "—"} />
        </div>
        <p className="mt-3 text-sm text-gray-500" aria-live="polite">
          No buttons needed—opening the app while signed in counts automatically.
        </p>
      </Section>

      {/* MANIFESTATION LIST */}
      <Section title="Manifestation list">
        {wishes.length === 0 ? (
          <Empty text="Your questionnaire wishes will show here." />
        ) : (
          <ul className="mt-3 space-y-2">
            {wishes.map((w, i) => (
              <li key={w.id ?? w.title ?? i} className="flex items-start gap-3 p-3 rounded-lg border">
                <span className="mt-1 inline-block w-2 h-2 rounded-full" />
                <div>
                  <div className="font-medium">{w.title}</div>
                  {w.note && <div className="text-sm text-gray-600">{w.note}</div>}
                  {w.created_at && (
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(w.created_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* WINS */}
      <Section title="Wins">
        {wins.length === 0 ? (
          <Empty text="No wins yet — keep chatting with Genie to earn points." />
        ) : (
          <ul className="mt-3 space-y-2">
            {wins.map((w) => (
              <li key={w.id} className="p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{w.title}</div>
                  <div className="text-sm">+{w.points ?? 0} pts</div>
                </div>
                {w.note && <div className="text-sm text-gray-600 mt-1">{w.note}</div>}
                <div className="text-xs text-gray-500 mt-1">{new Date(w.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

/* helpers */

function computeVisitStats(visits) {
  // streak counting back from today
  const set = new Set((visits || []).map((v) => v.visit_date));
  let streak = 0;
  const d = new Date();
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  // sessions this week (Sun..Sat)
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  const weekKey = start.toISOString().slice(0, 10);
  const weekCount = (visits || []).filter((v) => v.visit_date >= weekKey).length;
  const last = (visits || [])[0]?.visit_date ?? null;
  return { streak, weekCount, last };
}

function Section({ title, children }) {
  return (
    <section className="bg-white rounded-xl border p-4 sm:p-6 mb-6">
      <h2 className="text-lg font-medium mb-3">{title}</h2>
      {children}
    </section>
  );
}
function Stat({ label, value }) {
  return (
    <div className="rounded-lg border p-4 min-h-[72px]">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
function Empty({ text }) {
  return <p className="text-gray-600 mt-2">{text}</p>;
}
