// components/Confirm/SoftConfirmBar.tsx
import React from "react";
import clsx from "clsx";

type Props = {
  outcome?: string | null;
  block?: string | null;
  onLooksRight: () => void;
  onTweak: () => void;
};

const SoftConfirmBar: React.FC<Props> = ({
  outcome,
  block,
  onLooksRight,
  onTweak,
}) => {
  const o = (outcome || "").trim() || "your outcome";
  const b = (block || "").trim() || "a block";

  return (
    <section
      role="region"
      aria-label="Confirmation"
      className={clsx(
        "relative w-full overflow-hidden rounded-2xl",
        "bg-white/70 dark:bg-white/5 backdrop-blur",
        "ring-1 ring-black/10 dark:ring-white/10",
        "shadow-[0_6px_24px_rgba(0,0,0,0.08)]"
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

      <div className="flex gap-4 p-4 sm:p-5">
        <div
          aria-hidden
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_18px_rgba(245,158,11,0.35)]"
          )}
        >
          <span className="text-lg">✨</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-snug text-slate-900 dark:text-slate-100">
            I read your notes: you want <strong>“{o}”</strong>, but{" "}
            <strong>“{b}”</strong> keeps looping. <br></br>If that’s right, I’ll prescribe
            your first step.
          </p>

          {/* spaced buttons */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onLooksRight}
              aria-label="Looks right"
              className={clsx(
                "inline-flex items-center justify-center",
                "rounded-xl px-5 min-h-[44px] min-w-[44px]",
                "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
                "ring-1 ring-slate-900/10 dark:ring-slate-100/20",
                "hover:brightness-[1.06] active:brightness-[0.95]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
              )}
            >
              <span className="mr-2">✅</span>
              <span className="font-semibold">Looks right</span>
            </button>

          </div>
        </div>
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true" />
    </section>
  );
};

export default SoftConfirmBar;
