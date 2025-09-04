import React from "react";

type Props = {
  title: string;
  why?: string;
  /** Optional price info (not shown in CTA – kept for future use) */
  priceCents?: number;

  /** Legacy commerce props (kept for backward-compat, unused when onCta is provided) */
  buyUrl?: string;
  previewUrl?: string;
  onUnlock?: () => void;

  /** Close/hide the card */
  onClose?: () => void;

  /** 👇 New: parent-provided CTA handler (e.g., show Genie overlay in /pages/chat.js) */
  onCta?: (e?: React.MouseEvent<HTMLButtonElement>) => void;

  /** Optional CTA label */
  ctaLabel?: string;
};

export default function PrescriptionCard({
  title,
  why,
  priceCents = 1200,
  buyUrl = "https://hypnoticmeditations.ai/b/l0kmb",
  previewUrl, // unused
  onUnlock,
  onClose,
  onCta,
  ctaLabel = "Listen To This »",
}: Props): JSX.Element {
  const DUMMY_AUDIO =
    "https://cdnstreaming.myclickfunnels.com/audiofile/25873/file/original-3b1398f834c94cd9eeba088f4bcdba73/audiofile/25873/file/original-3b1398f834c94cd9eeba088f4bcdba73.flac";

  /** Fallback: only used if onCta is NOT provided */
  async function legacyUnlock() {
    try {
      if (buyUrl) {
        window.open(buyUrl, "_blank", "noopener,noreferrer");
        onClose?.();
        return;
      }
      if (onUnlock) {
        await onUnlock();
        onClose?.();
        return;
      }
      alert("No checkout link configured.");
    } catch {
      onClose?.();
    }
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    // Prevent any default navigation bubbling from parent wrappers
    e.preventDefault();
    e.stopPropagation();

    if (onCta) {
      // ✅ New path: delegate to parent (chat.js) to show Genie overlay + stage to chat
      onCta(e);
      return;
    }
    // Legacy fallback (commerce)
    legacyUnlock();
  }

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
        aria-label={ctaLabel}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
