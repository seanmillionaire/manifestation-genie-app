import React from "react";

type Props = {
  outcome?: string | null;
  block?: string | null;
  variant?: "high" | "mid" | "low"; // optional label if you want to show it
  onLooksRight: () => void;
  onTweak: () => void;
};

const SoftConfirmBar: React.FC<Props> = ({
  outcome,
  block,
  variant,
  onLooksRight,
  onTweak,
}) => {
  const o = outcome?.trim();
  const b = block?.trim();

  const line = `I read your notes: you want ${o ? `“${o}”` : "your outcome"}, but ${b ? `“${b}”` : "a block"} keeps tripping you. If that’s right, I’ll prescribe your first step.`;

  return (
    <div
      className="w-full max-w-3xl mx-auto mb-3 p-3 rounded-lg border shadow-sm bg-white"
      role="region"
      aria-label="Confirmation"
    >
      <p className="text-sm leading-snug">
        {line}
        {variant ? (
          <span className="ml-2 text-xs opacity-60" aria-hidden>
            ({variant} confidence)
          </span>
        ) : null}
      </p>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onLooksRight}
          className="px-3 py-2 rounded-md border font-medium hover:opacity-90 focus:outline-none focus:ring"
          aria-label="Looks right"
        >
          ✅ Looks right
        </button>
        <button
          type="button"
          onClick={onTweak}
          className="px-3 py-2 rounded-md border font-medium hover:opacity-90 focus:outline-none focus:ring"
          aria-label="Tweak"
        >
          ✏️ Tweak
        </button>
      </div>

      {/* screen readers get a short status ping when buttons are pressed; parent page can also manage this */}
      <div className="sr-only" aria-live="polite" aria-atomic="true" />
    </div>
  );
};

export default SoftConfirmBar;
