import { Bookmark, CheckSquare, Bug, Layers, GitCommit } from "lucide-react";
import type { IssueType } from "@prisma/client";

export function TypeIcon({ type, size = 16 }: { type: IssueType; size?: number }) {
  switch (type) {
    case "EPIC":
      return <span title="Epic"><Layers size={size} className="text-purple-600" /></span>;
    case "STORY":
      return <span title="Story"><Bookmark size={size} className="text-emerald-600 fill-emerald-600" /></span>;
    case "TASK":
      return <span title="Task"><CheckSquare size={size} className="text-blue-500" /></span>;
    case "BUG":
      return <span title="Bug"><Bug size={size} className="text-red-600" /></span>;
    case "SUBTASK":
      return <span title="Sub-task"><GitCommit size={size} className="text-slate-500" /></span>;
    default:
      return <CheckSquare size={size} className="text-blue-500" />;
  }
}
