import { useState } from "react";
import { CheckSquare, Square } from "lucide-react";

interface IssueSubtasksSectionProps {
  subtasks: any[];
  onToggleSubtask: (stId: string) => void;
  onAddSubtask: (title: string) => void;
}

export function IssueSubtasksSection({
  subtasks,
  onToggleSubtask,
  onAddSubtask,
}: IssueSubtasksSectionProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const completedSubtasks = subtasks.filter((s) => s.status === "DONE").length;
  const subtaskProgressPercent = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newSubtaskTitle.trim();
    if (!title) return;
    onAddSubtask(title);
    setNewSubtaskTitle("");
  };

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className="text-brand" />
          <h3 className="text-xs font-bold text-text uppercase tracking-wider">
            Subtasks ({completedSubtasks}/{subtasks.length})
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {subtasks.length > 0 && (
            <span className="text-xs font-bold font-mono text-brand">
              {subtaskProgressPercent}%
            </span>
          )}
        </div>
      </div>

      {/* Subtask Progress Bar */}
      {subtasks.length > 0 && (
        <div className="h-2 w-full bg-surface-sunken border border-border/40 rounded-full overflow-hidden p-0.5 shadow-inner">
          <div
            style={{ width: `${subtaskProgressPercent}%` }}
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-500 shadow-xs"
          />
        </div>
      )}

      {/* Subtasks Checklist List */}
      <div className="flex flex-col gap-1.5">
        {subtasks.map((st) => (
          <div
            key={st.id}
            onClick={() => onToggleSubtask(st.id)}
            className="flex items-center justify-between p-2 rounded-lg bg-surface-sunken hover:bg-neutral/50 border border-border/40 cursor-pointer text-xs transition-colors group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <button type="button" className="text-brand shrink-0">
                {st.status === "DONE" ? (
                  <CheckSquare size={16} className="text-emerald-500" />
                ) : (
                  <Square size={16} className="text-text-subtle group-hover:text-brand" />
                )}
              </button>
              <span className={`font-medium truncate min-w-0 ${st.status === "DONE" ? "line-through text-text-subtle" : "text-text"}`}>
                {st.summary}
              </span>
            </div>
            <span className="font-mono text-[10px] text-text-subtle">{st.key}</span>
          </div>
        ))}
      </div>

      {/* Add Subtask Inline Form */}
      <form onSubmit={handleAddSubtask} className="flex items-center gap-2 mt-1">
        <input
          type="text"
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          placeholder="+ Add subtask (press Enter)"
          className="flex-1 h-10 sm:h-8 px-3 text-xs rounded-lg border border-border bg-surface text-text outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="h-10 sm:h-8 px-3 bg-neutral hover:bg-neutral/80 text-text font-bold text-xs rounded-lg shrink-0"
        >
          Add
        </button>
      </form>
    </div>
  );
}
