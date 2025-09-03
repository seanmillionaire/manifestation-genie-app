import React from "react";

type Props = {
  title: string;
  why?: string;
  priceCents?: number;
  /** External store URL to buy */
  buyUrl?: string;
};

/**
 * PrescriptionCard
 * - Always shows a dummy audio preview (same for every product for now)
 * - Unlock button sends user to external store (buyUrl)
 */
export default function PrescriptionCard({
  title,
  why,
  priceCents = 1200,
  buyUrl = "https://hypnoticmeditations.ai/",
}: Props) {
  // 🔊 Dummy preview (same for every product)
  // Feel free to drop your own small MP3 here later.
  const DUMMY_AUDIO =
    "https://cdnstreaming.myclickfunnels.com/audiofile/25873/file/original-3b1398f834c94cd9eeba088f4bcdba73/audiofile/25873/file/original-3b1398f834c94cd9eeba088f4bcdba73.flac";

  const priceLabel = `$${(priceCents / 100).toFixed(0)}`;

  function unlock() {
    try {
      if (buyUrl) {
        // open in same tab so checkout flow continues
        window.location.href = buyUrl;
      } else {
        alert("Store link is missing.");
      }
    } catch {
      alert("Could not open the store link.");
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
        {/* Always the SAME dummy audio for now */}
        <audio controls preload="none" style={{ width: "100%" }}>
          <source src=https://cdnstreaming.myclickfunnels.com/audiofile/25873/file/original-3b1398f834c94cd9eeba088f4bcdba73/audiofile/25873/file/original-3b1398f834c94cd9eeba088f4bcdba73.flac type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      </div>

      <button
        onClick={unlock}
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
        aria-label={`Unlock — ${priceLabel}`}
      >
        Unlock — {priceLabel}
      </button>
    </div>
  );
}
