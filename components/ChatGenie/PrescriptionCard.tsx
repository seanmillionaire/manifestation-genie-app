import React from "react";

type Mode = "rx" | "buy";

type Props = {
  /** OPTIONAL: if omitted, we'll auto-detect based on presence of onCta */
  mode?: Mode;

  title: string;
  why?: string;

  /** BUY mode only */
  buyUrl?: string;

  /** RX mode only */
  onCta?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  ctaLabel?: string;

  /** legacy (kept for compatibility, used only in buy fallback) */
  previewUrl?: string;
  onUnlock?: () => void;

  /** close/hide the card */
  onClose?: () => void;

  /** not shown now, kept for future */
  priceCents?: number;
};

export default function PrescriptionCard({
  mode,
  title,
  why,
  buyUrl,
  onCta,
  ctaLabel,
  previewUrl, // unused
  onUnlock,   // legacy
  onClose,
  priceCents = 1200,
}: Props): JSX.Element {
  const DUMMY_AUDIO =
    "https://cdnstreaming.myclickfunnels.com/audiofile/25873/file/original-3b1398f834c94cd9eeba088f4bcdba73/audiofile/25873/file/original-3b1398f834c94cd9eeba088f4bcdba73.flac";

  // Auto-detect mode if not provided:
  // - If a parent gives us onCta, we assume RX (free) flow.
  // - Otherwise, default to BUY (open buyUrl).
  const effectiveMode: Mode = mode ?? (onCta ? "rx" : "buy");

  function openBuy() {
    const url = buyUrl?.trim();
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      onClose?.();
      return;
    }
    // legacy escape hatch
    if (onUnlock) {
      Promise.resolve(onUnlock()).finally(() => onClose?.());
      return;
    }
    alert("No checkout link configured.");
    onClose?.();
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (effectiveMode === "buy") {
      openBuy();
      return;
    }

    if (effectiveMode === "rx") {
      if (onCta) {
        onCta(e); // parent (chat.js) shows Genie overlay
        return;
      }
      // If dev forgot to pass onCta for rx, noop with a console hint
      console.warn("[PrescriptionCard] mode='rx' (effective) but no onCta provided.");
    }
  }

  const label =
    ctaLabel ?? (effectiveMode === "buy" ? "Unlock Session »" : "Listen To This »");

  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 14,
        background: "#fff",
        padding: 14,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>
        Tonight&apos;s prescription: {title}
      </div>

      {why ? (
        <div style={{ color: "#334155", marginBottom: 12 }}>{why}</div>
      ) : null}

      <div
        style={{
          background: "#f8fafc",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          padding: 10,
          marginBottom: 14,
        }}
      >
        <audio controls preload="none" style={{ width: "100%" }}>
          <source src={DUMMY_AUDIO} type="audio/flac" />
          <source src={DUMMY_AUDIO} type="audio/x-flac" />
          Your browser does not support the audio element.
        </audio>
      </div>

      <button
        onClick={handleClick}
        style={{
          display: "inline-block",
          background: "#ffd600",
          border: "1px solid #eab308",
          borderRadius: 12,
          padding: "12px 18px",
          fontWeight: 900,
          cursor: "pointer",
          minHeight: 44,
          minWidth: 44,
          boxShadow: "0 2px 0 rgba(0,0,0,0.06)",
        }}
        aria-label={label}
      >
        {label}
      </button>
    </div>
  );
}
