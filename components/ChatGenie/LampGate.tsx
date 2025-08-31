import { useEffect, useState } from "react";

type Props = {
  onUnlock: () => void;
  firstName?: string | null;
};

export default function LampGate({ onUnlock, firstName }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // small delay so animations feel smooth
    const t = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="relative flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-2xl border border-black/10 bg-white shadow-sm"
      role="dialog"
      aria-labelledby="lamp-title"
      aria-describedby="lamp-desc"
    >
      {/* Glow ring */}
      <div
        className={`absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-700 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      >
        <div className="absolute -inset-1 blur-2xl bg-gradient-to-b from-fuchsia-400/30 via-purple-400/20 to-indigo-400/20 rounded-2xl" />
      </div>

      {/* Lamp emoji button */}
      <button
        onClick={onUnlock}
        className="relative isolate h-40 w-40 md:h-48 md:w-48 rounded-full flex items-center justify-center select-none outline-none focus-visible:ring focus-visible:ring-indigo-500"
        aria-live="polite"
        aria-label="Touch the Lamp to speak with the Genie"
        title="Touch the Lamp to speak with the Genie"
      >
        {/* pulsing auras */}
        <span className="absolute inset-0 rounded-full animate-ping opacity-30 bg-fuchsia-400" aria-hidden="true" />
        <span className="absolute inset-0 rounded-full animate-pulse opacity-20 bg-purple-400" aria-hidden="true" />
        <span className="text-7xl md:text-8xl">🔮</span>
      </button>

      <h2 id="lamp-title" className="mt-6 text-2xl font-extrabold tracking-tight">
        Touch the Lamp to speak with the Genie
      </h2>
      <p id="lamp-desc" className="mt-2 text-sm text-black/70 max-w-md">
        {firstName ? `Welcome, ${firstName}!` : "Welcome!"} Tap the glowing orb to begin.
      </p>

      <p className="sr-only">After you touch the lamp, the chat will appear.</p>
    </div>
  );
}
