// components/Home/HomeScreen.tsx
import { useEffect, useState } from "react";
import { get, set } from "../../src/flowState";

// ✅ same helper your Chat page uses
// (it already knows how to read Supabase and cache mg_first_name)
async function hydrateName() {
  try {
    const m = await import("../../src/userName"); // { hydrateFirstNameFromSupabase }
    // @ts-ignore dynamic import
    await m.hydrateFirstNameFromSupabase?.();
  } catch {
    // ignore; we'll show default name fallback below
  }
}

export default function HomeScreen() {
  // use the SAME store as Chat
  const [S, setS] = useState(get());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 👇 hydrate like /pages/chat.js does
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // if name missing or placeholder, pull from Supabase
        const cur = get();
        if (!cur.firstName || cur.firstName === "Friend") {
          await hydrateName();
        }
        // re-read the global flow state so UI updates
        if (alive) setS(get());
      } catch (e) {
        if (alive) setErr("Could not load your profile. Showing default view.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    // keep in sync with other tabs (Chat page already does this)
    const onStorage = (e: StorageEvent) => {
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

  // Example: if you later add more profile fields, set them in the same store:
  // set({ profile: { ...get().profile, someField } })

  const firstName = S.firstName || "Friend";

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      {/* optional tiny status line (aria-live for screen readers) */}
      <p className="text-sm text-black/60 h-5" aria-live="polite">
        {loading ? "Loading your profile…" : err ? err : ""}
      </p>

      <h1 className="text-3xl font-extrabold mt-1">
        Welcome to the portal, {firstName} <span role="img" aria-label="waving hand">👋</span>
      </h1>

      {/* --- YOUR EXISTING HOME CONTENT GOES HERE ---
           Keep your Agreement card, Tip guide, etc.
           This file only fixed the data connection. */}

      <section className="mt-4 space-y-4">
        {/* Example ethical agreement card (leave yours if you already have it) */}
        {/* If you already have components, render them instead. */}
        {/* <AgreementCard /> */}
        {/* <TipGuide /> */}
      </section>
    </main>
  );
}
