import React from "react";

type Props = {
  title: string;
  why?: string;
  priceCents?: number;

  /** Preferred: external store URL */
  buyUrl?: string;

  /** Optional callbacks / legacy props */
  previewUrl?: string;         // ignored (we use a fixed dummy audio)
  onUnlock?: () => void;       // legacy fallback if no buyUrl
  onClose?: () => void;        // NEW: tell parent to dismiss the card after click
};

/**
 * PrescriptionCard
 * - Shows fixed FLAC preview
 * - On click: opens buyUrl in new tab, then calls onClose to hide the card
 */
export default function PrescriptionCard({
  title,
  why,
  priceCents = 1200,
  buyUrl = "https://hypnoticmeditations.ai/b/l0kmb",
  previewUrl,
  onUnlock,
  onClose,
}: Props) {
  const DUMMY_AUDIO =
    "https://cdnstreaming.myclickfunnels.com/audiofile/25873/file/original-3b1398f834c94cd9eeba088f4bcdba73/audiofile/25873/file/original-3b1398f834c94cd9eeba088f4bcdba73.flac";

  async function handleUnlock() {
    try {
      if (buyUrl) {
        // open in new tab + security flags
        window.open(buyUrl, "_blank", "noopener,noreferrer");
        // immediately dismiss from UI
        onClose?.();
        return;
      }
      if (onUnlock)↳
