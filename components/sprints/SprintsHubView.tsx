"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  Target,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SprintCard, type SprintCardData } from "./SprintCard";
import { CompleteSprintModal } from "./CompleteSprintModal";
import { createSprintAction, startSprintAction } from "@/app/(app)/projects/[key]/backlog/actions";

interface SprintsHubViewProps {
  projectId: string;
  projectKey: string;
  projectName: string;
  initialSprints: SprintCardData[];
}

export function SprintsHubView({ projectId, projectKey, projectName, initialSprints }: SprintsHubViewProps) {
  const router = useRouter();
  const [sprints, setSprints] = useState<SprintCardData[]>(initialSprints);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "ACTIVE" | "PLANNED" | "CLOSED">("ALL");

  // Modal states
  const [completingSprint, setCompletingSprint] = useState<SprintCardData | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintGoal, setNewSprintGoal] = useState("");
  const [isPending, startTransition] = useTransition();

  // Filtered sprints logic
  const filteredSprints = sprints.filter((sprint) => {
    const matchesSearch =
      sprint.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sprint.goal && sprint.goal.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === "ACTIVE") return sprint.status === "ACTIVE";
    if (activeTab === "PLANNED") return sprint.status === "PLANNED" || sprint.status === "FUTURE";
    if (activeTab === "CLOSED") return sprint.status === "CLOSED";
    return true;
  });

  // Calculate high-level telemetry stats
  const totalSprints = sprints.length;
  const activeSprint = sprints.find((s) => s.status === "ACTIVE");
  const closedSprints = sprints.filter((s) => s.status === "CLOSED");

  const totalPointsShipped = sprints.reduce((sum, s) => {
    const donePoints = s.issues
      .filter((i) => i.status === "DONE")
      .reduce((acc, i) => acc + (i.storyPoints || 0), 0);
    return sum + donePoints;
  }, 0);

  const availableTargetSprints = sprints
    .filter((s) => (s.status === "PLANNED" || s.status === "FUTURE") && s.id !== completingSprint?.id)
    .map((s) => ({ id: s.id, name: s.name }));

  const handleStartSprint = async (sprintId: string) => {
    startTransition(async () => {
      await startSprintAction(sprintId);
      setSprints((prev) =>
        prev.map((s) => (s.id === sprintId ? { ...s, status: "ACTIVE" } : s))
      );
      router.refresh();
    });
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSprintName.trim()) return;

    startTransition(async () => {
      const res = await createSprintAction(projectId, newSprintName.trim(), newSprintGoal.trim() || undefined);
      if (res && res.sprint) {
        setSprints((prev) => [res.sprint as SprintCardData, ...prev]);
        setNewSprintName("");
        setNewSprintGoal("");
        setIsCreateModalOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">{projectName} Sprints</h1>
            <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400">
              {totalSprints} Total
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Directory of active, planned, and archived sprint performance data.
          </p>
        </div>

        <Button appearance="primary" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          <span>Create Sprint</span>
        </Button>
      </div>

      {/* Analytics Summary Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Active Sprint */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Sprint</span>
            <Layers className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-slate-100">
            {activeSprint ? activeSprint.name : "None Running"}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {activeSprint ? `${activeSprint.issues.length} active issues` : "Start a sprint from planned"}
          </p>
        </div>

        {/* Card 2: Total Velocity Shipped */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Points Shipped</span>
            <TrendingUp className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-indigo-400">{totalPointsShipped} pts</div>
          <p className="mt-1 text-xs text-slate-400">Across all completed sprints</p>
        </div>

        {/* Card 3: Closed Archives */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Closed Archives</span>
            <CheckCircle2 className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-slate-100">{closedSprints.length} Sprints</div>
          <p className="mt-1 text-xs text-slate-400">Available in Sprint Retrospectives</p>
        </div>

        {/* Card 4: Retrospective Quick Link */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Retrospective Board</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <Button
            appearance="subtle"
            onClick={() => router.push(`/projects/${projectKey}/retro`)}
            className="mt-2 h-7 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
          >
            Launch Retrospectives →
          </Button>
        </div>
      </div>

      {/* Controls Bar: Search & Status Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1">
          {(["ALL", "ACTIVE", "PLANNED", "CLOSED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === tab
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab === "ALL" && "All Sprints"}
              {tab === "ACTIVE" && "Active"}
              {tab === "PLANNED" && "Planned"}
              {tab === "CLOSED" && "Closed Archive"}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Filter sprints by name or goal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Sprint Cards Directory Grid */}
      {filteredSprints.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
          {filteredSprints.map((sprint) => (
            <SprintCard
              key={sprint.id}
              sprint={sprint}
              projectKey={projectKey}
              onStartSprint={handleStartSprint}
              onCompleteSprint={(s) => setCompletingSprint(s)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-12 text-center">
          <Layers className="mx-auto h-10 w-10 text-slate-600" />
          <h3 className="mt-3 text-sm font-semibold text-slate-300">No sprints found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {searchQuery
              ? "No sprints match your filter query."
              : "Create your first sprint to start planning work."}
          </p>
        </div>
      )}

      {/* Complete Sprint Modal */}
      {completingSprint && (
        <CompleteSprintModal
          isOpen={!!completingSprint}
          onClose={() => setCompletingSprint(null)}
          sprint={{
            id: completingSprint.id,
            name: completingSprint.name,
            projectId,
            projectKey,
            issues: completingSprint.issues,
            availableTargetSprints,
          }}
          onCompleted={() => {
            setSprints((prev) =>
              prev.map((s) => (s.id === completingSprint.id ? { ...s, status: "CLOSED" } : s))
            );
            router.refresh();
          }}
          onOpenRetro={() => router.push(`/projects/${projectKey}/retro?sprintId=${completingSprint.id}`)}
        />
      )}

      {/* Create Sprint Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-100">Create New Sprint</h3>
            <form onSubmit={handleCreateSprint} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Sprint Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sprint 8"
                  value={newSprintName}
                  onChange={(e) => setNewSprintName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Sprint Goal (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="What is the objective of this sprint?"
                  value={newSprintGoal}
                  onChange={(e) => setNewSprintGoal(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button appearance="subtle" type="button" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button appearance="primary" type="submit" disabled={isPending}>
                  {isPending ? "Creating..." : "Create Sprint"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
