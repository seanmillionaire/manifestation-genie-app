import React from "react";

type Props = {
  outcome?: string | null;
  block?: string | null;
  variant?: "high" | "mid" | "low" | null;
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
  const o = outcome?.trim() || "your outcome";
  const b = block?.trim() || "a block";

  return (
    <div
      role="region"
      aria-label="Confirmation"
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 16,
        padding: 14,
        background:
          "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div
          aria-hidden
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "#ffd600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
          }}
        >
          ✨
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, lineHeight: 1.35, color: "#111827" }}>
            I read your notes: you want <strong>“{o}”</strong>, but{" "}
            <strong>“{b}”</strong> keeps looping. If that’s right, I’ll prescribe
            your first step.
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onLooksRight}
              aria-label="Looks right"
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: 0,
                background: "#ffd600",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              ✅ Looks right
            </button>
            <button
              type="button"
              onClick={onTweak}
              aria-label="Tweak"
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✏️ Tweak
            </button>

            {variant && (
              <span
                aria-hidden
                style={{
                  marginLeft: 6,
                  alignSelf: "center",
                  fontSize: 12,
                  color: "rgba(0,0,0,0.55)",
                }}
              >
                {variant} confidence
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true" />
    </div>
  );
};

export default SoftConfirmBar;
