import React, { useEffect } from "react";

export const TipGuide = ({ slides, step, onStepChange, onFinish }) => {
  const last = slides.length - 1;
  const s = Math.max(0, Math.min(step, last));
  const pct = Math.round(((s + 1) / slides.length) * 100);

  useEffect(() => {
    const region = document.getElementById("tipguide-region");
    if (region) region.focus();
  }, [s]);

  return (
    <div className="rounded-lg border overflow-hidden bg-white">
      <div className="h-1 bg-neutral-100">
        <div className="h-1" style={{ width: `${pct}%` }} />
      </div>

      <div
        id="tipguide-region"
        tabIndex={-1}
        className="p-4 outline-none"
        aria-live="polite"
        aria-label={`Manifestation tip ${s + 1} of ${slides.length}`}
      >
        <h2 className="text-lg font-semibold">{slides[s].title}</h2>
        <p className="mt-2 text-neutral-700">{slides[s].body}</p>

        <div className="mt-4 flex items-center justify-between">
          <button
            className="px-3 py-2 text-sm border rounded disabled:opacity-40"
            onClick={() => onStepChange(s - 1)}
            disabled={s === 0}
          >
            Back
          </button>

          {s < last ? (
            <button
              className="px-4 py-2 text-sm rounded bg-black text-white"
              onClick={() => onStepChange(s + 1)}
            >
              Next
            </button>
          ) : (
            <button
              className="px-4 py-2 text-sm rounded bg-amber-500 text-black font-medium"
              onClick={() => {
                onStepChange(s, true);
                onFinish();
              }}
              aria-label="Start today's manifestation"
            >
              Start today’s manifestation
            </button>
          )}
        </div>

        <div className="mt-3 flex gap-1" aria-hidden>
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded ${
                i <= s ? "bg-black" : "bg-neutral-200"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
