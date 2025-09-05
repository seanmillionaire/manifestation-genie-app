// /pages/profile.js
// Profile now mirrors Chat context: Vibe, Wish/Block/Micro, recent exchanges, and sigil stats.
// If signed out, it shows a “guest profile” using the same FlowState/localStorage that Chat uses.
// If signed in, it augments with Supabase data (streak, wins, synced wishes).

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../src/supabaseClient";
import { get as getFlowState } from "../src/flowState";

/* ----------------- Chat-context helpers (FlowState + localStorage) ----------------- */

function displayNameFromSources(user) {
  try {
    const fsName = (getFlowState()?.firstName || "").trim();
    if (fsName) return fsName;
  } catch {}
  return (
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.first_name ||
    "Manifestor"
  );
}

function readChatContext() {
  try {
    const fs = getFlowState?.() || {};
    const vibe = fs?.vibe || null;
    const wish = fs?.currentWish?.wish || "";
    const block = fs?.currentWish?.block || "";
    const micro = fs?.currentWish?.micro || "";
    const date = fs?.currentWish?.date || null;
    const thread = Array.isArray(fs?.thread) ? fs.thread : [];

    return { vibe, wish, block, micro, date, thread };
  } catch {
    // localStorage fallbacks (kept light)
    let wish = "", block = "";
    if (typeof window !== "undefined") {
      wish =
        localStorage.getItem("mg_wish_title") ||
        localStorage.getItem("mg_current_wish") ||
        localStorage.getItem("wish") || "";
      block =
        localStorage.getItem("mg_wish_block") ||
        localStorage.getItem("wish_block") || "";
    }
    return { vibe: null, wish, block, micro: "", date: null, thread: [] };
  }
}

function looksLikeSigil(text = "") {
  // Heuristic: multi-line + good density of $, 8, or ASCII grid characters
  const lines = (text || "").split(/\n/);
  if (lines.length < 4) return false;
  const dense = (text.match(/[$8#%@*^+=|\\\/_—\-]{1,}/g) || []).join("");
  return dense.length >= 12;
}

function summarizeThread(thread = [], pairs = 3) {
  // Collect last N user→assistant exchanges
  const items = [];
  let i = thread.length - 1;
  while (i >= 0 && items.length < pairs) {
    // find last assistant
    while (i >= 0 && thread[i]?.role !== "assistant") i--;
    const a = thread[i]; i--;
    // find the user that preceded it
    while (i >= 0 && thread[i]?.role !== "user") i--;
    const u = thread[i]; i--;

    if (a || u) {
      items.push({
        user: (u?.content || "").trim(),
        assistant: (a?.content || "").trim(),
      });
    }
  }
  return items;
}

function collectSigilFacts(thread = []) {
  const sigils = thread
    .filter((m) => m.role === "assistant" && looksLikeSigil(m.content))
    .map((m) => m.content);

  const lastSigil = sigils[sigils.length - 1] || null;
  // show a short preview (first ~8 lines)
  const lastSigilPreview = lastSigil
    ? lastSigil.split("\n").slice(0, 8).join("\n")
    : null;

  return { total: sigils.length, lastSigilPreview };
}

function fallbackWishFromClient() {
  const { wish, block, date } = readChatContext();
  if ((wish || "").trim()) {
    return [{ id: "flowstate", title: wish.trim(), note: (block || "").trim(), created_at: date || null }];
  }
  return [];
}

/* ------------------------------ Supabase helpers ----------------------------- */

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

/* -------------------------------- component -------------------------------- */

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Supabase-backed stats (only when signed in)
  const [streak, setStreak] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [lastDate, setLastDate] = useState(null);
  const [wishes, setWishes] = useState([]);
  const [wins, setWins] = useState([]);

  // Chat context (always available)
  const chatCtx = useMemo(readChatContext, []);
  const recap = useMemo(() => summarizeThread(chatCtx.thread, 3), [chatCtx.thread]);
  const sigilFacts = useMemo(() => collectSigilFacts(chatCtx.thread), [chatCtx.thread]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) console.error("getSession error:", sessErr);
        const u = session?.user ?? null;
        if (!alive) return;
        setUser(u);

        // Start with local/flowstate wishes so guests see something instantly
        let wl = fallbackWishFromClient();

        if (u) {
          // Visits
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

          // Wishes (synced)
          try {
            const { data: wlView, error: wlErr } = await supabase
              .from("user_questionnaire_wishlist")
              .select("user_id, title, created_at")
              .eq("user_id", u.id)
              .order("created_at", { ascending: false });

            if (wlErr) {
              const { data: wlTbl, error: wlTblErr } = await supabase
                .from("wishes")
                .select("id, title, note, created_at")
                .eq("user_id", u.id)
                .order("created_at", { ascending: false });
              if (wlTblErr) console.warn("wishes table error:", wlTblErr);
              wl = (wlTbl && wlTbl.length ? wlTbl : wl);
            } else {
              wl = (wlView && wlView.length ? wlView : wl);
            }
          } catch (e) {
            console.warn("wishlist fetch failed:", e);
          }

          // Wins
          const { data: wn, error: winsErr } = await supabase
            .from("wins")
            .select("id, title, note, points, created_at")
            .eq("user_id", u.id)
            .order("created_at", { ascending: false });
          if (winsErr) console.error("wins error:", winsErr);
          if (!alive) return;
          setWins(wn || []);
        }
        if (!alive) return;
        setWishes(wl);
      } catch (e) {
        console.error("Profile load fatal:", e);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  /* --------------------------------- UI --------------------------------- */

  if (loading) {
    return (
      <PageWrap>
        <H1>Your Profile</H1>
        <Muted>This is your personal dashboard</Muted>
        <Card><Muted>Loading…</Muted></Card>
      </PageWrap>
    );
  }

  const name = displayNameFromSources(user);

  return (
    <PageWrap>
      <H1>Your Profile</H1>
      <Muted>This is your personal dashboard</Muted>

      {/* USER INFO */}
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{name}</div>
          <div style={{ fontSize: 15, color: "var(--muted)" }}>
            {user ? user.email : "Not signed in — showing local data from this device."}
          </div>
          <div style={{ marginTop: 10 }}>
            {!user ? (
              <a href="/auth" style={{ fontWeight: 800, textDecoration: "underline" }}>
                Log in to sync across devices »
              </a>
            ) : null}
          </div>
        </div>
      </Card>

      {/* CHAT CONTEXT (always visible) */}
      <Card>
        <H2>From Your Chats</H2>

        {/* Vibe + Wish row */}
        <div style={grid2}>
          <div style={pillBox}>
            <div style={pillLabel}>Vibe</div>
            <div style={pillValue}>{chatCtx.vibe?.name || "—"}</div>
          </div>
          <div style={pillBox}>
            <div style={pillLabel}>Micro-action</div>
            <div style={pillValue}>{chatCtx.micro || "—"}</div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700 }}>Primary Wish</div>
          <div style={{ marginTop: 4 }}>{chatCtx.wish || "—"}</div>
          {chatCtx.block ? (
            <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 4 }}>
              Blocker: {chatCtx.block}
            </div>
          ) : null}
        </div>

        {/* Chat recap */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Recent Exchanges</div>
          {recap.length === 0 ? (
            <Muted>No recent messages yet.</Muted>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {recap.map((r, i) => (
                <li key={i} style={rowItem}>
                  {r.user ? (
                    <div style={{ marginBottom: 6 }}>
                      <span style={roleTagUser}>You</span>{" "}
                      <span>{truncate(r.user, 220)}</span>
                    </div>
                  ) : null}
                  {r.assistant ? (
                    <div>
                      <span style={roleTagGenie}>Genie</span>{" "}
                      <span style={{ whiteSpace: "pre-wrap" }}>{truncate(r.assistant, 280)}</span>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Sigils */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>Rituals (sigils)</div>
            <span style={badge}>{sigilFacts.total}</span>
          </div>
          {sigilFacts.lastSigilPreview ? (
            <pre style={sigilBox}>{sigilFacts.lastSigilPreview}</pre>
          ) : (
            <Muted>No sigils yet — ask Genie for a sigil ritual.</Muted>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <a href="/chat" style={{ fontWeight: 800, textDecoration: "underline" }}>
            Continue your conversation »
          </a>
        </div>
      </Card>

      {/* SIGNED-IN STATS */}
      {user ? (
        <>
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
        </>
      ) : null}
    </PageWrap>
  );
}

/* ------------------------------- UI helpers ------------------------------- */
function PageWrap({ children }) {
  return (
    <div style={{ width: "min(1100px, 94vw)", margin: "32px auto 48px", padding: "0 4px" }}>
      {children}
    </div>
  );
}
function H1({ children }) { return <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 6px", color: "var(--text)" }}>{children}</h1>; }
function H2({ children }) { return <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 12px", color: "var(--text)" }}>{children}</h2>; }
function Muted({ children }) { return <p style={{ color: "var(--muted)", margin: "4px 0 16px", fontSize: 15 }}>{children}</p>; }
function Card({ children }) {
  return <section style={{
    background: "#fff", border: "1px solid var(--border)", borderRadius: 12,
    padding: "18px 20px", margin: "20px 0", boxShadow: "0 2px 4px rgba(0,0,0,0.04)"
  }}>{children}</section>;
}
function Stat({ label, value }) {
  return <div style={{
    border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px",
    minHeight: 80, background: "var(--soft)"
  }}>
    <div style={{ fontSize: 14, color: "var(--muted)" }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: "var(--text)" }}>{value}</div>
  </div>;
}

const grid2 = { display: "grid", gridTemplateColumns: "1fr", gap: 12 };
const grid3 = { display: "grid", gridTemplateColumns: "1fr", gap: 16 };
if (typeof window !== "undefined") {
  const m2 = window.matchMedia("(min-width: 720px)");
  if (m2.matches) grid2.gridTemplateColumns = "1fr 1fr";
  const m3 = window.matchMedia("(min-width: 720px)");
  if (m3.matches) grid3.gridTemplateColumns = "repeat(3, 1fr)";
}

const rowItem = { border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginTop: 10, background: "var(--soft)" };
const subMeta = { fontSize: 13, color: "var(--muted)", marginTop: 6 };
const finePrint = { fontSize: 13, color: "var(--muted)", marginTop: 12 };

const pillBox = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 12px",
  background: "var(--soft)",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};
const pillLabel = { fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em" };
const pillValue = { fontWeight: 700, fontSize: 16 };

const roleTagUser = {
  fontSize: 12,
  fontWeight: 800,
  padding: "2px 6px",
  borderRadius: 6,
  background: "#eef2ff",
  color: "#3730a3",
  marginRight: 6,
};
const roleTagGenie = {
  fontSize: 12,
  fontWeight: 800,
  padding: "2px 6px",
  borderRadius: 6,
  background: "#ecfeff",
  color: "#155e75",
  marginRight: 6,
};
const badge = {
  fontSize: 12,
  fontWeight: 900,
  padding: "2px 8px",
  borderRadius: 999,
  background: "#111",
  color: "#ffd600",
};
const sigilBox = {
  marginTop: 8,
  whiteSpace: "pre-wrap",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 10,
  background: "#0f172a",
  color: "#e5e7eb",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 12.5,
  overflowX: "auto",
};

/* ------------------------------- small utils ------------------------------- */
function truncate(s = "", max = 260) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
