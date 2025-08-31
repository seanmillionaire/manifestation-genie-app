// components/Home/HomeScreen.jsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { get, set } from "../../src/flowState";

async function hydrateName() {
  try {
    const m = await import("../../src/userName"); // { hydrateFirstNameFromSupabase }
    if (m && typeof m.hydrateFirstNameFromSupabase === "function") {
      await m.hydrateFirstNameFromSupabase();
    }
  } catch {
    // ignore; we'll show a friendly fallback
  }
}

// simple local version flag for the agreement text
const AGREEMENT_VERSION = "v1";
const AGREED_KEY = `mg_agreed_${AGREEMENT_VERSION}`;

export default function HomeScreen() {
  const router = useRouter();
  const [S, setS] = useState(get());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // agreement UI
  const [checked, setChecked] = useState(false);
  const [agreedAt, setAgreedAt] = useState(
    typeof window !== "undefined" ? localStorage.getItem(AGREED_KEY) : null
  );

  // hydrate name the exact same way Chat does
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

    // sync with other tabs (Chat writes mg_first_name)
    const onStorage = (e) => {
      if (e.key === "mg_first_name") setS(get());
      if (e.key === AGREED_KEY) setAgreedAt(e.newValue);
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

  // handle agreement accept
  const acceptAgreement = async () => {
    const ts = new Date().toISOString();
    // save locally for UX + versioning
    if (typeof window !== "undefined") localStorage.setItem(AGREED_KEY, ts);
    setAgreedAt(ts);

    // also reflect into the same global store so other places can read it
    set({ agreement: { version: AGREEMENT_VERSION, acceptedAt: ts } });

    // TODO: if you want to persist to Supabase, call your API here.
    // try { await supabase.from('agreements').upsert({ ... }) } catch {}

    // advance the flow if you want
    // router.push("/vibe-select");
  };

  return (
    <main
      className="mx-auto my-8"
      style={{ width: "min(900px, 94vw)" }} // same width as chat console
    >
      {/* --- Header matches chat console --- */}
      <h1
        className="mb-3"
        style={{ fontSize: 28, fontWeight: 900 }}
      >
        Welcome back, {firstName}
      </h1>

      {/* tiny status line like your screenshot */}
      <p className="text-sm text-black/60 h-5" aria-live="polite">
        {loading ? "Loading your profile…" : err ? err : ""}
      </p>

      {/* --- Main card matches chat container look --- */}
      <section
        className="rounded-xl border p-3"
        style={{
          borderColor: "rgba(0,0,0,0.08)",
          background: "#fafafa",
          minHeight: 220,
        }}
      >
        {/* Ethical Agreement Card */}
        <div className="bg-white rounded-xl border border-black/10 p-4">
          <h2 className="text-lg font-bold mb-2">Ethical agreement</h2>
          <p className="text-sm">
            I will use the Genie’s magic for good.
            <br />
            Toward my highest self and the well-being of others.
          </p>

          {/* if already accepted, show timestamp + subtle banner */}
          {agreedAt ? (
            <div className="mt-3 text-xs text-green-700 bg-green-100 border border-green-300 rounded-lg px-3 py-2">
              Accepted {new Date(agreedAt).toLocaleString()} (version {AGREEMENT_VERSION})
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-5 h-5"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  aria-label="I agree to the statement"
                />
                <span className="text-sm">I agree to this statement</span>
              </label>
              <button
                onClick={acceptAgreement}
                disabled={!checked}
                className={`px-4 py-2 rounded-lg font-bold border ${
                  checked
                    ? "bg-yellow-300 border-yellow-400 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                    : "bg-yellow-300/60 border-yellow-400/60 cursor-not-allowed"
                }`}
                aria-disabled={!checked}
                style={{ minHeight: 44, minWidth: 44 }} // 44px target
              >
                I agree
              </button>
            </div>
          )}
        </div>

        {/* Tip Guide Card (simple, matches chat box visuals) */}
        <div className="bg-white rounded-xl border border-black/10 p-4 mt-4">
          <h2 className="text-lg font-bold mb-2">Manifestation tips</h2>
          <ol className="list-decimal pl-5 text-sm space-y-1">
            <li>Be clear about your wish.</li>
            <li>Speak in the present tense.</li>
            <li>Keep it positive and simple.</li>
          </ol>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => router.push("/chat")}
              className="px-4 py-2 rounded-lg font-bold border bg-white border-black/20 hover:brightness-95"
              style={{ minHeight: 44, minWidth: 44 }}
            >
              Open Chat
            </button>
            <button
              onClick={() => router.push("/vibe-select")}
              className="px-4 py-2 rounded-lg font-bold border bg-yellow-300 border-yellow-400 hover:brightness-105"
              style={{ minHeight: 44, minWidth: 44 }}
            >
              Choose Your Vibe
            </button>
          </div>
        </div>
      </section>

      {/* footer spacer to mirror the feel of chat page */}
      <div className="h-6" />
    </main>
  );
}
