import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Send } from "lucide-react";

interface IssueCommentsSectionProps {
  commentsList: any[];
  onPostComment: (text: string) => void;
  onToggleReaction: (commentId: string, emoji: string) => void;
  onPasteImage: (e: React.ClipboardEvent) => void;
}

export function IssueCommentsSection({
  commentsList,
  onPostComment,
  onToggleReaction,
  onPasteImage,
}: IssueCommentsSectionProps) {
  const [commentInput, setCommentInput] = useState("");
  const actionChips = ["Approved", "Please review", "Needs info", "In progress"];

  const handleChipClick = (chip: string) => {
    setCommentInput((prev) => (prev ? `${prev} ${chip}` : chip));
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    onPostComment(commentInput.trim());
    setCommentInput("");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Comment Form */}
      <form onSubmit={handlePostComment} className="flex flex-col gap-2 rounded-lg border border-border p-3 bg-neutral/20">
        <div className="flex items-center gap-2 mb-1">
          <Avatar name="You" size={24} />
          <span className="text-xs font-bold text-text">Add a comment...</span>
          <span className="text-[10px] text-text-subtle ml-auto italic">Cmd+V paste image • Hotkey &apos;C&apos;</span>
        </div>

        <textarea
          id="comment-input"
          rows={3}
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          onPaste={onPasteImage}
          placeholder="Type your comment or update... Markdown & Cmd+V image paste supported"
          className="w-full rounded border border-border bg-surface p-2.5 text-xs outline-none focus:border-brand font-sans"
        />

        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-text-subtle uppercase mr-1">Quick reply:</span>
            {actionChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="px-3 py-1.5 sm:px-2 sm:py-0.5 rounded-full bg-surface border border-border text-[11px] font-semibold text-text-subtle hover:text-brand hover:border-brand transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
          <Button appearance="primary" type="submit" className="bg-brand text-white text-xs font-bold flex items-center gap-1.5">
            <Send size={12} /> Save
          </Button>
        </div>
      </form>

      {/* Comments Feed */}
      <div className="flex flex-col gap-3 divide-y divide-border/60">
        {commentsList.length === 0 ? (
          <p className="text-xs text-text-subtle italic py-2">No comments yet.</p>
        ) : (
          commentsList.map((c) => (
            <div key={c.id} className="pt-3 flex items-start gap-3">
              <Avatar name={c.author?.name || c.author || "User"} src={c.author?.avatarUrl} size={28} />
              <div className="flex-1 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-text">{c.author?.name || c.author || "User"}</span>
                  <span className="text-[11px] text-text-subtle">
                    {typeof c.createdAt === "string" ? c.createdAt.split("T")[0] : "Recently"}
                  </span>
                </div>
                <p className="text-text whitespace-pre-wrap leading-relaxed mb-2">{c.body || c.text}</p>

                {/* Comment Emoji Reactions Bar */}
                <div className="flex items-center gap-1.5">
                  {["👍", "🚀", "❤️", "👀"].map((emoji) => {
                    const count = (c.reactions && c.reactions[emoji]) || 0;
                    return (
                      <button
                        key={emoji}
                        onClick={() => onToggleReaction(c.id, emoji)}
                        className={`px-3 py-1.5 sm:px-2 sm:py-0.5 rounded-full border text-[11px] font-semibold transition-colors ${
                          count > 0 ? "bg-brand/10 border-brand/40 text-brand" : "bg-neutral/40 border-border text-text-subtle hover:bg-neutral"
                        }`}
                      >
                        {emoji} {count > 0 ? count : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
