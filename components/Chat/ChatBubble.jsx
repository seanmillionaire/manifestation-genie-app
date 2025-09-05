// /components/Chat/ChatBubble.jsx
import React from "react";

export default function ChatBubble({
  id,
  role = "assistant",         // "assistant" | "user"
  content = "",
  reactions = {},             // { userLiked?: boolean, genieLiked?: boolean }
  onToggleUserLike,           // () => void
}) {
  const isAI = role !== "user";
  const avatar = isAI ? "🧞‍♂️" : "🙂";

  return (
    <div
      style={{
        marginBottom: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: isAI ? "flex-start" : "flex-end",
      }}
    >
      {/* avatar row */}
      <div
        aria-hidden
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          marginBottom: 4,
          color: "#334155",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            lineHeight: "26px",
            textAlign: "center",
            borderRadius: "50%",
            background: isAI ? "#eef2ff" : "#fef3c7",
            border: "1px solid rgba(0,0,0,0.08)",
            display: "inline-block",
          }}
        >
          {avatar}
        </span>
        <span>{isAI ? "Genie" : "You"}</span>
      </div>

      {/* bubble */}
      <div
        style={{
          background: isAI ? "rgba(0,0,0,0.04)" : "rgba(255,214,0,0.15)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          padding: "10px 12px",
          maxWidth: "90%",
          whiteSpace: "pre-wrap",
          lineHeight: 1.45,
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {/* reactions row */}
      <div
        style={{
          marginTop: 6,
          display: "flex",
          alignItems: "center",
          gap: 8,
          opacity: 0.85,
        }}
      >
        {/* user can like any Genie message; user can also “like” their own if you want */}
        <button
          onClick={onToggleUserLike}
          aria-label="Like"
          title="Like"
          style={{
            appearance: "none",
            border: "1px solid rgba(0,0,0,0.12)",
            background: reactions?.userLiked ? "#fde68a" : "#fff",
            borderRadius: 999,
            padding: "3px 8px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          👍 {reactions?.userLiked ? "Liked" : "Like"}
        </button>

        {/* passive “Genie liked this” badge shown when Genie auto-likes a user’s good message */}
        {reactions?.genieLiked ? (
          <span
            aria-label="Genie liked this"
            title="Genie liked this"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#eef2ff",
              padding: "3px 8px",
              borderRadius: 999,
              fontSize: 12,
            }}
          >
            🧞‍♂️ 👍 Genie liked this
          </span>
        ) : null}
      </div>
    </div>
  );
}
