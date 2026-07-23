import { BoardColumnSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function ProjectDetailLoading() {
  return (
    <main className="flex-1 px-8 py-6 animate-pulse overflow-y-auto">
      {/* Breadcrumbs */}
      <Skeleton className="h-4 w-48 mb-3" />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-56 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Kanban / Board Skeleton */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((col) => (
          <BoardColumnSkeleton key={col} />
        ))}
      </div>
    </main>
  );
}
