import React from "react";

export const AgreementCard = ({
  agreed,
  agreedAt,
  onAgree,
  saving,
  justAgreed,
}) => {
  const format = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      className={[
        "rounded-lg border p-4 transition-all bg-white",
        agreed ? "opacity-35 saturate-75 pointer-events-none" : "opacity-100",
        justAgreed ? "ring-2 ring-offset-2 ring-amber-400" : "ring-0",
      ].join(" ")}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <input
          id="agree-good"
          type="checkbox"
          className="mt-1 h-6 w-6"
          checked={agreed}
          onChange={onAgree}
          disabled={agreed || !!saving}
          aria-describedby="agree-desc"
        />
        <div>
          <label htmlFor="agree-good" className="font-medium">
            I will use the Genie’s magic for good.
          </label>
          <p id="agree-desc" className="text-sm text-neutral-600 mt-1">
            Toward my highest self and the well-being of others.
          </p>

          {agreed ? (
            <p className="mt-2 inline-flex items-center text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
              ✓ Agreed {agreedAt ? `on ${format(agreedAt)}` : ""}
            </p>
          ) : (
            <button
              onClick={onAgree}
              disabled={!!saving}
              className="mt-3 inline-flex items-center rounded-md px-3 py-2 border text-sm hover:bg-neutral-50"
            >
              {saving ? "Saving…" : "I agree"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
