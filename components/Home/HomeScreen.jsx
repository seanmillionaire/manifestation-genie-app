// components/Home/HomeScreen.jsx
import { useEffect, useState } from "react";
import { get, set } from "../../src/flowState";

async function hydrateName() {
  try {
    const m = await import("../../src/userName"); // { hydrateFirstNameFromSupabase }
    if (m && typeof m.hydrateFirstNameFromSupabase === "function") {
      await m.hydrateFirstNameFromSupabase();
    }
  } catch {
    // ignore — we'll show default fallback
  }
}

export default function HomeScreen() {
  const [S, setS] = useState(get());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const cur = get();
        if (!cur.firstName || cur.firstName === "Friend") {
          await hydrateName();          // pull name from Supabase (same as Chat)
        }
        if (alive) setS(get());         // re-read global state so UI updates
      } catch (e) {
        if (alive) setErr("Could not load your profile. Showing default view.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    // keep in sync with other tabs (Chat writes mg_first_name)
    const onStorage = (e) => {
      if (e.key === "mg_first_name") setS(get());
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
    }
    return () => {
      alive = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", onStorage);
      }
    };
  }, []);

  const firstName = S.firstName || "Friend";

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <p className="text-sm text-black/60 h-5" aria-live="polite">
        {loading ? "Loading your profile…" : err ? err : ""}
      </p>

      <h1 className="text-3xl font-extrabold mt-1">
        Welcome to the portal, {firstName} <span role="img" aria-label="waving hand">👋</span>
      </h1>

      {/* Your existing components here */}
      {/* <AgreementCard /> */}
      {/* <TipGuide /> */}
    </main>
  );
}
