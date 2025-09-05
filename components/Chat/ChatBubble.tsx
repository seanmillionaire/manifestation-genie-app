// /components/Chat/ChatBubble.tsx
import React from "react";

type Props = {
  id: string;
  role: "assistant" | "user" | "system";
  /** HTML string (already escaped upstream) */
  content: string;
};

/**
 * Minimal bubble with avatars. Like button removed.
 */
const ChatBubble: React.FC<Props> = ({ role, content }) => {
  const isAI = role !== "user";
  const name = isAI ? "Genie" : "You";
  const avatar = isAI ? "🧞‍♂️" : "🙂";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isAI ? "28px auto" : "auto 28px",
        gap: 8,
        alignItems: "flex-start",
        marginBottom: 8,
      }}
    >
      {isAI && (
        <div
          aria-hidden
          style={{
            width: 28,
            height: 28,
            display: "grid",
            placeItems: "center",
            borderRadius: 999,
            background: "rgba(0,0,0,0.06)",
          }}
          title={name}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>{avatar}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", alignItems: isAI ? "flex-start" : "flex-end" }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#334155",
            marginBottom: 4,
            textAlign: isAI ? "left" : "right",
          }}
        >
          {name}
        </div>

        <div
          style={{
            background: isAI ? "rgba(0,0,0,0.04)" : "rgba(255,214,0,0.15)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 12,
            padding: "8px 10px",
            maxWidth: "90%",
            whiteSpace: "pre-wrap",
            lineHeight: 1.4,
          }}
          // content already escaped upstream
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>

      {!isAI && (
        <div
          aria-hidden
          style={{
            width: 28,
            height: 28,
            display: "grid",
            placeItems: "center",
            borderRadius: 999,
            background: "rgba(255,214,0,0.25)",
          }}
          title={name}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>{avatar}</span>
        </div>
      )}
    </div>
  );
};

export default ChatBubble;
