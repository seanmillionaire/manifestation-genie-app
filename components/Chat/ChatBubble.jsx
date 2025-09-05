import React from "react";

export default function ChatBubble({
  id,
  role = "assistant",               // "assistant" | "user"
  content = "",                      // already HTML-escaped by caller
  reactions = { userLiked: false, genieLiked: false },
  onToggleUserLike = () => {},
  userName = "You",
}) {
  const isAI = role !== "user";

  // avatar + label
  const avatar = isAI ? "🧞‍♂️" : "🙂";
  const label  = isAI ? "Genie" : userName || "You";

  // bubble colors
  const bubbleStyle = {
    background: isAI ? "rgba(0,0,0,0.04)" : "rgba(255,214,0,0.15)",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 12,
    padding: "8px 10px",
    maxWidth: "92%",
    whiteSpace: "pre-wrap",
    lineHeight: 1.4,
  };

  // compact “Like” pill
  const liked = !!reactions?.userLiked;
  const likeStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 22,
    padding: "0 8px",
    fontSize: 12,
    lineHeight: "22px",
    borderRadius: 999,
    border: liked ? "1px solid #f59e0b" : "1px solid rgba(0,0,0,.12)",
    background: liked ? "#fde68a" : "rgba(0,0,0,.04)",
    color: "#334155",
    cursor: "pointer",
  };

  // tiny “Genie liked this” badge when Genie auto-likes a USER message
  const showGenieLiked = !isAI && reactions?.genieLiked;

  return (
    <div
      style={{
        marginBottom: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: isAI ? "flex-start" : "flex-end",
      }}
    >
      {/* header: avatar + name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <div
          aria-hidden
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            fontSize: 14,
            background: isAI ? "#eef2ff" : "#fff7ed",
            border: "1px solid rgba(0,0,0,.08)",
          }}
        >
          <span>{avatar}</span>
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#334155",
          }}
        >
          {label}
        </div>
      </div>

      {/* bubble */}
      <div
        style={bubbleStyle}
        // content already sanitized by caller (escapeHTML + nl2br)
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {/* actions row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 6,
          // keep Like under the bubble on the same side
          justifyContent: isAI ? "flex-start" : "flex-end",
          width: "100%",
        }}
      >
        {/* Genie liked badge (only on user messages) */}
        {showGenieLiked && (
          <span
            title="Genie liked this"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              padding: "0 8px",
              height: 20,
              borderRadius: 999,
              background: "#eef2ff",
              border: "1px solid rgba(0,0,0,.08)",
              color: "#334155",
            }}
          >
            🧞‍♂️ 👍
            <span style={{ opacity: 0.8 }}>Genie liked</span>
          </span>
        )}

        {/* user like toggle (works on both AI + user bubbles) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleUserLike(id);
          }}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          style={likeStyle}
        >
          <span aria-hidden>👍</span>
          <span style={{ fontWeight: 600 }}>{liked ? "Liked" : "Like"}</span>
        </button>
      </div>
    </div>
  );
}
