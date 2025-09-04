// components/ChatGenie/TweakChips.tsx
import React from "react";

type StateKind = "Clarity" | "Courage" | "Calm" | "Energy";

type Props = {
  outcome: string | null | undefined;
  block: string | null | undefined;
  stateGuess: StateKind | null | undefined;
  onApply: (next: { outcome?: string; block?: string; state?: StateKind | null }) => void;
  onClose: () => void;
};

function Chip({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!selected}
      className={[
        "min-h-[40px] rounded-2xl px-4 text-sm transition",
        "ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
        selected
          ? "bg-amber-100 text-slate-900 ring-amber-300"
          : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function TweakChips({
  outcome,
  block,
  stateGuess,
  onApply,
  onClose,
}: Props) {
  const [o, setO] = React.useState(outcome || "");
  const [b, setB] = React.useState(block || "");
  const [s, setS] = React.useState<StateKind | null>(stateGuess || null);
  const [customO, setCustomO] = React.useState("");
  const [customB, setCustomB] = React.useState("");

  const outcomeAlts = [
    outcome || "your outcome",
    "More clients / income",
    "A loving relationship",
    "Deep focus & momentum",
    "Better sleep & energy",
  ];
  const blockAlts = [
    block || "a block",
    "Procrastination",
    "Doubt / Imposter voice",
    "Overwhelm / Stress",
    "Fear of failing",
  ];
  const states: StateKind[] = ["Clarity", "Courage", "Calm", "Energy"];

  return (
    <section
      role="region"
      aria-label="Tweak selections"
      className={[
        "relative w-full max-w-3xl mx-auto overflow-hidden rounded-2xl",
        "bg-white/70 backdrop-blur ring-1 ring-black/10",
        "shadow-[0_6px_24px_rgba(0,0,0,0.08)]",
        "p-4 sm:p-5",
      ].join(" ")}
    >
      {/* luxe top hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-900">Genie Chat</h2>
        <button
          type="button"
          onClick={onClose}
          className={[
            "min-h-[40px] rounded-xl px-4 text-sm",
            "bg-white ring-1 ring-slate-300 hover:bg-slate-50",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
          ].join(" ")}
          aria-label="Close tweaks"
        >
          Done
        </button>
      </div>

      <p className="mb-5 text-sm text-slate-600">
        Quick tweaks—no typing needed. Tap to adjust, or set a custom value.
      </p>

      {/* Outcome */}
      <div className="mb-6">
        <div className="mb-2 text-sm font-semibold text-slate-800">Outcome</div>
        <div className="flex flex-wrap gap-2">
          {outcomeAlts.map((x, i) => (
            <Chip key={i} selected={o === x} onClick={() => setO(x)}>
              {x}
            </Chip>
          ))}

          {/* Custom outcome */}
          <div className="inline-flex items-center gap-2">
            <input
              aria-label="Custom outcome"
              placeholder="Custom…"
              value={customO}
              onChange={(e) => setCustomO(e.target.value)}
              className={[
                "h-[40px] min-w-[200px] rounded-xl",
                "border border-slate-300 bg-white px-3 text-sm",
                "placeholder:text-slate-400",
                "focus:outline-none focus:ring-2 focus:ring-amber-400/70",
              ].join(" ")}
            />
            <button
              type="button"
              className={[
                "min-h-[40px] rounded-xl px-3 text-sm",
                "bg-white ring-1 ring-slate-300 hover:bg-slate-50",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
              ].join(" ")}
              onClick={() => {
                if (customO.trim()) setO(customO.trim());
              }}
            >
              Use
            </button>
          </div>
        </div>
      </div>

      {/* Block */}
      <div className="mb-6">
        <div className="mb-2 text-sm font-semibold text-slate-800">Block</div>
        <div className="flex flex-wrap gap-2">
          {blockAlts.map((x, i) => (
            <Chip key={i} selected={b === x} onClick={() => setB(x)}>
              {x}
            </Chip>
          ))}

          {/* Custom block */}
          <div className="inline-flex items-center gap-2">
            <input
              aria-label="Custom block"
              placeholder="Custom…"
              value={customB}
              onChange={(e) => setCustomB(e.target.value)}
              className={[
                "h-[40px] min-w-[200px] rounded-xl",
                "border border-slate-300 bg-white px-3 text-sm",
                "placeholder:text-slate-400",
                "focus:outline-none focus:ring-2 focus:ring-amber-400/70",
              ].join(" ")}
            />
            <button
              type="button"
              className={[
                "min-h-[40px] rounded-xl px-3 text-sm",
                "bg-white ring-1 ring-slate-300 hover:bg-slate-50",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
              ].join(" ")}
              onClick={() => {
                if (customB.trim()) setB(customB.trim());
              }}
            >
              Use
            </button>
          </div>
        </div>
      </div>

      {/* State */}
      <div className="mb-6">
        <div className="mb-2 text-sm font-semibold text-slate-800">State</div>
        <div className="flex flex-wrap gap-2">
          {states.map((x) => (
            <Chip key={x} selected={s === x} onClick={() => setS(x)}>
              {x}
            </Chip>
          ))}
          <Chip selected={!s} onClick={() => setS(null)}>
            No preference
          </Chip>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onApply({ outcome: o, block: b, state: s })}
          className={[
            "inline-flex items-center justify-center",
            "rounded-xl px-5 min-h-[44px] min-w-[44px]",
            "bg-slate-900 text-white",
            "ring-1 ring-slate-900/10",
            "hover:brightness-[1.06] active:brightness-[0.95]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
          ].join(" ")}
          aria-label="Apply tweaks"
        >
          <span className="mr-2" aria-hidden>
            ✅
          </span>
          <span className="font-semibold">Looks right</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className={[
            "rounded-xl px-5 min-h-[44px] min-w-[44px]",
            "bg-white ring-1 ring-slate-300 text-slate-800 hover:bg-slate-50",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
          ].join(" ")}
          aria-label="Close without applying"
        >
          ✖ Close
        </button>
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true" />
    </section>
  );
}
