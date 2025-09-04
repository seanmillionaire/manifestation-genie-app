// /components/SoftConfirmBar.tsx
import React from "react";
import clsx from "clsx";

type Props = {
  outcome?: string | null;
  block?: string | null;
  variant?: "high" | "mid" | "low" | null;
  onLooksRight: () => void;
  onTweak: () => void;
};

const variantLabel: Record<NonNullable<Props["variant"]>, string> = {
  high: "High confidence",
  mid: "Medium confidence",
  low: "Low confidence",
};

const SoftConfirmBar: React.FC<Props> = ({
  outcome,
  block,
  variant,
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
        // Panel: subtle glass + premium border + soft shadow
        "relative w-full overflow-hidden rounded-2xl",
        "bg-white/70 dark:bg-white/5 backdrop-blur",
        "ring-1 ring-black/10 dark:ring-white/10",
        "shadow-[0_6px_24px_rgba(0,0,0,0.08)]"
      )}
    >
      {/* Top hairline glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

      <div className="flex gap-4 p-4 sm:p-5">
        {/* Icon */}
        <div
          aria-hidden
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_18px_rgba(245,158,11,0.35)]"
          )}
        >
          <span className="text-lg" aria-hidden>
            ✨
          </span>
        </div>

        {/* Copy + Actions */}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-snug text-slate-900 dark:text-slate-100">
            I read your notes: you want <strong>“{o}”</strong>, but{" "}
            <strong>“{b}”</strong> keeps looping. If that’s right, I’ll prescribe
            your first step.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {/* Primary */}
            <button
              type="button"
              onClick={onLooksRight}
              aria-label="Looks right"
              className={clsx(
                "inline-flex items-center justify-center",
                "rounded-xl px-4 sm:px-5",
                "min-h-[44px] min-w-[44px]",
                // Premium black w/ gold ring
                "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
                "ring-1 ring-slate-900/10 dark:ring-slate-100/20",
                "hover:brightness-[1.06] active:brightness-[0.95]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
              )}
            >
              <span className="mr-2" aria-hidden>✅</span>
              <span className="font-semibold">Looks right</span>
            </button>

            {/* Secondary */}
            <button
              type="button"
              onClick={onTweak}
              aria-label="Tweak"
              className={clsx(
                "inline-flex items-center justify-center",
                "rounded-xl px-4 sm:px-5",
                "min-h-[44px] min-w-[44px]",
                "bg-white/70 dark:bg-white/5",
                "ring-1 ring-slate-300/70 dark:ring-white/15",
                "text-slate-800 dark:text-slate-100",
                "hover:bg-white/90 dark:hover:bg-white/10",
                "active:scale-[0.99]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
              )}
            >
              <span className="mr-2" aria-hidden>✏️</span>
              <span className="font-medium">Tweak</span>
            </button>

            {/* Confidence pill (optional) */}
            {variant && (
              <span
                aria-label={variantLabel[variant]}
                className={clsx(
                  "ml-1 inline-flex items-center gap-1 rounded-full px-3",
                  "min-h-[28px]",
                  "text-xs font-medium tracking-wide",
                  "ring-1",
                  {
                    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30":
                      variant === "high",
                    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30":
                      variant === "mid",
                    "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30":
                      variant === "low",
                  }
                )}
              >
                <span
                  className={clsx(
                    "h-1.5 w-1.5 rounded-full",
                    {
                      "bg-emerald-500": variant === "high",
                      "bg-amber-500": variant === "mid",
                      "bg-rose-500": variant === "low",
                    }
                  )}
                />
                {variantLabel[variant]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* polite status live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true" />
    </section>
  );
};

export default SoftConfirmBar;
