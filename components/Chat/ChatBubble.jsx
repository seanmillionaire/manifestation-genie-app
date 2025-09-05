// /components/Chat/ChatBubble.jsx
import React from "react";

/**
 * Props
 * - id: string
 * - role: "assistant" | "user"
 * - content: string (already HTML-escaped + nl2br'd upstream)
 * - reactions: { userLiked?: boolean, genieLiked?: boolean }
 * - onToggleUserLike: () => void
 */
export default function ChatBubble({
  id,
  role = "assistant",
  content = "",
  reactions = { userLiked: false, genieLiked: false },
  onToggleUserLike,
}) {
  const isAI = role !== "user";
  const name = isAI ? "Genie" : "You";
  const avatar = isAI ? "🧞‍♂️" : "🙂";

  return (
    <div
      key={id}
      style={{
        marginBottom: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: isAI ? "flex-start" : "flex-end",
      }}
    >
      {/* tiny header with avatar + name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span
          aria-hidden
          style={{
            fontSize: 14,
            lineHeight: 1,
            filter: isAI ? "none" : "grayscale(0.1)",
          }}
        >
          {avatar}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#334155",
            opacity: 0.9,
          }}
        >
          {name}
        </span>
      </div>

      {/* bubble */}
      <div
        style={{
          background: isAI ? "rgba(0,0,0,0.04)" : "rgba(255,214,0,0.16)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          padding: "8px 10px",
          maxWidth: "90%",
          whiteSpace: "pre-wrap",
          lineHeight: 1.42,
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {/* reactions row (compact) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 6,
          // nudge toward the bubble side
          alignSelf: isAI ? "flex-start" : "flex-end",
        }}
      >
        {/* Like pill — compact */}
        <button
          type="button"
          onClick={onToggleUserLike}
          aria-pressed={!!reactions.userLiked}
          title={reactions.userLiked ? "Unlike" : "Like"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            padding: "4px 8px",
            borderRadius: 999,
            border: "1px solid rgba(0,0,0,0.15)",
            background: reactions.userLiked ? "#fde68a" : "white",
            color: "#111827",
            boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
            cursor: "pointer",
          }}
        >
          <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>
            👍
          </span>
          <span>{reactions.userLiked ? "Liked" : "Like"}</span>
        </button>

        {/* Genie auto-like indicator (tiny, subtle) */}
        {reactions.genieLiked && (
          <span
            title="Genie liked this"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              padding: "2px 6px",
              borderRadius: 999,
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.22)",
              color: "#1e3a8a",
            }}
          >
            <span aria-hidden style={{ fontSize: 12 }}>
              ✨
            </span>
            Genie liked
          </span>
        )}
      </div>
    </div>
  );
}
