// components/Chat/ChatBubble.tsx
import React from "react";

type Props = {
  id: string;
  role: "assistant" | "user" | "system";
  /** HTML string (already sanitized/escaped upstream) */
  content: string;
};

const ChatBubble: React.FC<Props> = ({ role, content }) => {
  const isAI = role !== "user";

  const avatar = isAI ? "🧞‍♂️" : "🙂";
  const name   = isAI ? "Genie" : "You";

  return (
    <div
      style={{
        marginBottom: 10,
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        flexDirection: isAI ? "row" : "row-reverse",
      }}
    >
      {/* avatar */}
      <div
        aria-hidden
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(0,0,0,.10)",
          background: "#fff",
          lineHeight: 1,
          fontSize: 16,
        }}
      >
        <span>{avatar}</span>
      </div>

      {/* bubble */}
      <div style={{ maxWidth: "88%" }}>
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
            whiteSpace: "pre-wrap",
            lineHeight: 1.4,
          }}
          // content is already escaped upstream
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* No reactions / like row on purpose */}
      </div>
    </div>
  );
};

export default ChatBubble;
