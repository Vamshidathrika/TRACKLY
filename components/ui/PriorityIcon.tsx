import { ChevronsUp, ChevronUp, Equal, ChevronDown, ChevronsDown } from "lucide-react";
import type { IssuePriority } from "@prisma/client";

export function PriorityIcon({ priority, size = 16 }: { priority: IssuePriority; size?: number }) {
  switch (priority) {
    case "HIGHEST":
      return <span title="Highest Priority"><ChevronsUp size={size} className="text-red-600" /></span>;
    case "HIGH":
      return <span title="High Priority"><ChevronUp size={size} className="text-red-500" /></span>;
    case "MEDIUM":
      return <span title="Medium Priority"><Equal size={size} className="text-amber-500" /></span>;
    case "LOW":
      return <span title="Low Priority"><ChevronDown size={size} className="text-blue-500" /></span>;
    case "LOWEST":
      return <span title="Lowest Priority"><ChevronsDown size={size} className="text-blue-600" /></span>;
    default:
      return <Equal size={size} className="text-amber-500" />;
  }
}
