import React from "react";

type Props = {
  title: string;
  why: string;
  priceCents: number;
  previewUrl?: string;
  onUnlock: () => void;
};

export default function PrescriptionCard({
  title,
  why,
  priceCents,
  previewUrl,
  onUnlock,
}: Props) {
  const dollars = (priceCents / 100).toFixed(0);

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{title}</div>
      <p style={{ fontSize: 18, lineHeight: 1.7, marginBottom: 10 }}>{why}</p>

      {previewUrl ? (
        <audio controls src={previewUrl} style={{ width: "100%", marginBottom: 10 }} />
      ) : null}

      <button
        className="btn btn-primary"
        onClick={onUnlock}
        aria-label={`Unlock ${title}`}
      >
        Unlock — ${dollars}
      </button>
    </div>
  );
}
