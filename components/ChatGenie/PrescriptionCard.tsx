import React from "react";

type Props = {
  title: string;
  why?: string;
  priceCents?: number;
  buyUrl?: string;              // external store URL
  // legacy (kept for compatibility)
  previewUrl?: string;          // ignored (we always use dummy audio)
  onUnlock?: () => void;        // legacy fallback
  onClose?: () => void;         // notify parent to hide card
};

export default function PrescriptionCard({
  title,
  why,
  priceCents = 1200, // not shown in CTA text (kept for future use)
  buyUrl = "https://hypnoticmeditations.ai/b/l0kmb",
  previewUrl, // unused
  onUnlock,
  onClose,
}: Props): JSX.Element {
  const DUMMY_AUDIO =
    "https://cdnstreaming.myclickfunnels.com/audiofile/25873/file/original-3b1398f834c94cd9eeba088f4bcdba73/audiofile/25873/file/original-3b1398f834c94cd9eeba088f4bcdba73.flac";

  async function handleUnlock() {
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
        onClick={handleUnlock}
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
        aria-label="Listen To This"
      >
        Listen To This »
      </button>
    </div>
  );
}
