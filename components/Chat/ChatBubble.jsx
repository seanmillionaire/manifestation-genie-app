// /components/Chat/ChatBubble.tsx
import React from "react";
import clsx from "clsx";

type Reactions = { userLiked?: boolean; genieLiked?: boolean };
type Props = {
  id: string;
  role: "assistant" | "user" | string;
  content: string;                 // already escaped HTML (we render as HTML)
  reactions?: Reactions;
  onToggleUserLike?: () => void;
};

const Avatar: React.FC<{ role: string }> = ({ role }) => {
  const isAI = role !== "user";
  return (
    <div
      aria-hidden
      className={clsx(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
        isAI ? "bg-sky-50 border-sky-200" : "bg-amber-50 border-amber-200"
      )}
      style={{ fontSize: 12, lineHeight: 1 }}
      title={isAI ? "Genie" : "You"}
    >
      {isAI ? "🧞‍♂️" : "🙂"}
    </div>
  );
};

const LikePill: React.FC<{ liked?: boolean; onClick?: () => void; align: "left" | "right" }> = ({ liked, onClick, align }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!liked}
      className={clsx(
        "mt-1 inline-flex items-center gap-1 rounded-md border text-[11px] leading-none",
        "px-2 py-[3px] select-none",
        liked
          ? "bg-amber-100 border-amber-300 text-amber-900"
          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100",
        align === "left" ? "self-start" : "self-end"
      )}
      style={{ transform: "translateY(-2px)" }}
    >
      <span style={{ fontSize: 12, lineHeight: 1 }}>{liked ? "👍" : "👍"}</span>
      <span>Like</span>
    </button>
  );
};

const ChatBubble: React.FC<Props> = ({ role, content, reactions, onToggleUserLike }) => {
  const isAI = role !== "user";
  return (
    <div className={clsx("mb-2 flex w-full", isAI ? "justify-start" : "justify-end")}>
      {isAI && <Avatar role={role} />}

      <div className={clsx("mx-2 flex max-w-[88%] flex-col")}>
        <div
          className={clsx(
            "rounded-xl border px-3 py-2 text-[14px] leading-snug",
            isAI
              ? "bg-slate-50 border-slate-200 text-slate-900"
              : "bg-amber-50 border-amber-200 text-slate-900"
          )}
          dangerouslySetInnerHTML={{ __html: content }}
        />
        {/* compact like */}
        <LikePill liked={!!reactions?.userLiked} onClick={onToggleUserLike} align={isAI ? "left" : "right"} />
      </div>

      {!isAI && <Avatar role={role} />}
    </div>
  );
};

export default ChatBubble;
