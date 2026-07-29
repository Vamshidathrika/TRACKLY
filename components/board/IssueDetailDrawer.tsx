"use client";

import React, { useRef } from "react";
import { ShieldAlert, Sparkles, Paperclip, ArrowRight, Layers, History as HistoryIcon, Clock, MessageSquare } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { TimeLogModal, formatHoursToReadable } from "@/components/issues/TimeLogModal";
import { logWorkAction, updateIssueFieldAction } from "@/app/(app)/projects/[key]/issues/actions";
import { RichEditorLoader } from "@/components/editor/RichEditorLoader";
import { RichRenderer } from "@/components/editor/RichRenderer";
import type { MentionMember, RichValue } from "@/components/editor/types";
import type { BoardIssue, BoardUserOption } from "./IssueCard";
import { IssueDetailHeader } from "./issue-detail/IssueDetailHeader";
import { IssueCommentsSection } from "./issue-detail/IssueCommentsSection";
import { IssueSubtasksSection } from "./issue-detail/IssueSubtasksSection";
import { IssueWorkLogsSection } from "./issue-detail/IssueWorkLogsSection";
import { IssueSidebar } from "./issue-detail/IssueSidebar";
import { IssueDeveloperContext } from "./issue-detail/IssueDeveloperContext";
import { IssueLinkedIssues } from "./issue-detail/IssueLinkedIssues";
import { IssueAttachments } from "./issue-detail/IssueAttachments";
import { useIssueDetailDrawer } from "./useIssueDetailDrawer";
import { DevelopmentPanel } from "@/components/issues/DevelopmentPanel";

export function IssueDetailDrawer({
  issue,
  onClose,
  onUpdateIssue,
  onDeleteIssue,
  availableUsers = [],
}: {
  issue: BoardIssue | null;
  onClose: () => void;
  onUpdateIssue: (updated: BoardIssue) => void;
  onDeleteIssue: (issueId: string) => void;
  availableUsers?: BoardUserOption[];
}) {
  const state = useIssueDetailDrawer({ issue, onClose, onUpdateIssue, onDeleteIssue, availableUsers });
  // Written on every RichEditor keystroke, read once on Save — same pattern
  // (and rationale) as components/issues/IssueDetail.tsx's descriptionValueRef.
  // Kept local to this component rather than in useIssueDetailDrawer.ts, which
  // this task avoids touching.
  const descriptionValueRef = useRef<RichValue | null>(null);

  if (!issue || !state) return null;

  const estimatedHoursStr = typeof state.estimateHours === "number" ? state.estimateHours : parseFloat(String(state.estimateHours)) || 0;
  const isBlocked = state.activeBlockers.length > 0;

  // Project members offered by the @-mention popup in both the description
  // editor and the comment composer below. BoardUserOption has no `email`
  // field, so MentionMember's optional email is simply left undefined here.
  const mentionMembers: MentionMember[] = availableUsers.map((u) => ({
    id: u.id,
    name: u.name,
    avatarUrl: u.avatarUrl,
  }));

  // `updateIssueFieldAction`'s `description` field only accepts a plain
  // string today (see app/(app)/projects/[key]/issues/actions.ts — owned by
  // another agent right now). The rich doc round-trips in this session via
  // `descriptionValueRef`; only its plaintext mirror is persisted until a
  // `descriptionJson` write path lands — see .plan/editor-deps.md,
  // "Server-side wiring still required". Written directly here (not via
  // state.handleDescriptionSave, which only knows the hook's own plain-text
  // `description` state) so useIssueDetailDrawer.ts stays untouched.
  const handleRichDescriptionSave = async () => {
    const nextText = (descriptionValueRef.current?.text ?? state.description).trim();
    state.setIsEditingDescription(false);
    if (nextText === (issue.description || "")) return;
    state.setDescription(nextText);
    onUpdateIssue({ ...issue, description: nextText });
    await updateIssueFieldAction(issue.id, "description", nextText);
  };

  return (
    <>
      {state.showTimeModal && (
        <TimeLogModal
          isOpen={state.showTimeModal}
          onClose={() => state.setShowTimeModal(false)}
          issueKey={issue.key}
          issueSummary={state.summary}
          currentLoggedHours={state.loggedHours}
          estimatedHours={estimatedHoursStr}
          onLogTime={async (hours, desc, startedAt) => {
            const res = await logWorkAction(issue.id, hours, desc, startedAt);
            if (res?.error) return res.error;
            const newLogged = state.loggedHours + hours;
            state.setLoggedHours(newLogged);
            if (res.log) {
              state.setWorkLogsList((prev: any) => [res.log, ...prev]);
              state.setHistoryList((prev: any) => [
                {
                  id: `history-${Date.now()}`,
                  field: "worklog",
                  oldValue: null,
                  newValue: `${hours}h${desc?.trim() ? ` (${desc.trim()})` : ""}`,
                  createdAt: new Date().toISOString(),
                  author: res.log.author,
                },
                ...prev,
              ]);
            }
            onUpdateIssue({ ...issue, loggedHours: newLogged });
            return null;
          }}
          onUpdateEstimate={async (h) => {
            state.setEstimateHours(h);
            onUpdateIssue({ ...issue, originalEstimate: h, estimatedHours: h });
            await updateIssueFieldAction(issue.id, "originalEstimate", h);
          }}
        />
      )}

      <div
        className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-fade-in"
        onDragOver={(e) => {
          e.preventDefault();
          state.setIsDraggingFile(true);
        }}
        onDragLeave={() => state.setIsDraggingFile(false)}
        onDrop={(e) => {
          e.preventDefault();
          state.setIsDraggingFile(false);
          state.handleFileUpload(e.dataTransfer.files);
        }}
      >
        <div
          className={`relative w-full bg-surface border-l border-border h-full shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-slide-in-right ${
            state.isWideMode ? "md:max-w-4xl" : "md:max-w-2xl"
          }`}
        >
          {state.isDraggingFile && (
            <div className="absolute inset-0 z-50 bg-brand/20 backdrop-blur-xs border-2 border-dashed border-brand flex flex-col items-center justify-center text-brand font-bold gap-2">
              <Paperclip size={32} className="animate-bounce" />
              <span>Drop files here to attach to {issue.key}</span>
            </div>
          )}

          {state.toastMessage && (
            <div className="absolute top-16 left-6 z-50 rounded-lg bg-text text-surface px-3.5 py-2 text-xs font-semibold shadow-xl border border-brand/30 animate-bounce flex items-center gap-2">
              <Sparkles size={14} className="text-brand" />
              <span>{state.toastMessage}</span>
            </div>
          )}

          <IssueDetailHeader
            issue={issue}
            currentType={state.currentType}
            viewsCount={state.viewsCount}
            isWatching={state.isWatching}
            watchersCount={state.watchersCount}
            isWideMode={state.isWideMode}
            onToggleWideMode={() => state.setIsWideMode(!state.isWideMode)}
            onToggleWatch={state.handleToggleWatch}
            onAiSummarize={state.handleAiSummarize}
            onDelete={state.handleDelete}
            onClose={onClose}
            showToast={state.showToast}
          />

          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 flex flex-col gap-6">
              {isBlocked && (
                <div className="p-3.5 rounded-[12px] bg-danger/10 border border-danger/30 text-danger text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldAlert size={16} className="shrink-0 text-danger" />
                    <span className="truncate min-w-0">
                      <strong>Blocked by task:</strong> {state.activeBlockers[0].key} ({state.activeBlockers[0].summary})
                    </span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold bg-danger/20 text-danger px-2.5 py-0.5 rounded-full">
                    {state.activeBlockers[0].status}
                  </span>
                </div>
              )}

              <div>
                {state.isEditingSummary ? (
                  <input
                    type="text"
                    value={state.summary}
                    onChange={(e) => state.setSummary(e.target.value)}
                    onBlur={state.handleSummaryBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") state.handleSummaryBlur();
                      if (e.key === "Escape") {
                        state.setSummary(issue.summary);
                        state.setIsEditingSummary(false);
                      }
                    }}
                    autoFocus
                    className="w-full text-xl font-bold text-text bg-surface border border-brand rounded-lg px-2.5 py-1.5 outline-none"
                  />
                ) : (
                  <h1
                    onClick={() => state.setIsEditingSummary(true)}
                    className="text-xl font-bold text-text hover:bg-neutral/60 px-2 py-1 -ml-2 rounded-lg cursor-pointer transition-colors"
                  >
                    {issue.summary}
                  </h1>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider">Description</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={state.handleAiGenerateAcceptanceCriteria}
                      className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={12} /> Acceptance Criteria
                    </button>
                    <span className="text-[10px] text-text-subtle italic">Hotkey &apos;E&apos; to edit</span>
                  </div>
                </div>

                {state.isEditingDescription ? (
                  <div className="flex flex-col gap-2">
                    <RichEditorLoader
                      initialDoc={(issue as any).descriptionJson ?? null}
                      initialText={state.description}
                      ariaLabel="Issue description"
                      placeholder="Add a detailed description…"
                      members={mentionMembers}
                      issueId={issue.id}
                      minHeightClassName="min-h-[90px]"
                      autoFocus
                      onChange={(value: RichValue) => {
                        descriptionValueRef.current = value;
                      }}
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => state.setIsEditingDescription(false)}
                        className="px-3 py-1.5 text-xs font-medium text-text-subtle hover:bg-neutral rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRichDescriptionSave}
                        className="px-3 py-1.5 text-xs font-semibold bg-brand text-white hover:bg-brand-hovered rounded-lg shadow-xs"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => state.setIsEditingDescription(true)}
                    className="min-h-[90px] text-sm text-text bg-surface-sunken hover:bg-neutral/60 rounded-xl p-3 cursor-pointer transition-colors border border-border/50"
                  >
                    <RichRenderer
                      doc={(issue as any).descriptionJson}
                      fallbackText={issue.description}
                      emptyLabel="Add a detailed description…"
                      className="text-sm"
                    />
                  </div>
                )}
              </div>

              <IssueSubtasksSection
                subtasks={state.subtasks}
                onToggleSubtask={state.handleToggleSubtask}
                onAddSubtask={state.handleAddSubtask}
              />

              <IssueDeveloperContext
                pullRequests={state.pullRequests}
                commits={state.commits}
                setPullRequests={state.setPullRequests}
                showToast={state.showToast}
              />

              <IssueLinkedIssues
                issueId={issue.id}
                linkedIssues={state.linkedIssues}
                setLinkedIssues={state.setLinkedIssues}
                refreshDetail={state.refreshDetail}
                showToast={state.showToast}
              />

              <IssueAttachments
                issueId={issue.id}
                attachments={state.attachments}
                setAttachments={state.setAttachments}
                isUploading={state.isUploading}
                setIsUploading={state.setIsUploading}
                refreshDetail={state.refreshDetail}
                showToast={state.showToast}
              />

              <div className="flex flex-col gap-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex gap-4 text-xs font-bold text-text-subtle overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <button
                      onClick={() => state.setActiveTab("comments")}
                      className={`pb-3 -mb-3 transition-colors flex items-center gap-1.5 ${
                        state.activeTab === "comments" ? "border-b-2 border-brand text-brand font-bold" : "hover:text-text"
                      }`}
                    >
                      <MessageSquare size={14} /> Comments ({state.commentsList.length})
                    </button>
                    <button
                      onClick={() => state.setActiveTab("history")}
                      className={`pb-3 -mb-3 transition-colors flex items-center gap-1.5 ${
                        state.activeTab === "history" ? "border-b-2 border-brand text-brand font-bold" : "hover:text-text"
                      }`}
                    >
                      <HistoryIcon size={14} /> History ({state.historyList.length})
                    </button>
                    <button
                      onClick={() => state.setActiveTab("worklog")}
                      className={`pb-3 -mb-3 transition-colors flex items-center gap-1.5 ${
                        state.activeTab === "worklog" ? "border-b-2 border-brand text-brand font-bold" : "hover:text-text"
                      }`}
                    >
                      <Clock size={14} /> Work Log ({state.workLogsList.length})
                    </button>
                    <button
                      onClick={() => state.setActiveTab("development")}
                      className={`pb-3 -mb-3 transition-colors flex items-center gap-1.5 ${
                        state.activeTab === "development" ? "border-b-2 border-brand text-brand font-bold" : "hover:text-text"
                      }`}
                    >
                      <Layers size={14} className="text-purple-600" /> Development & Apps
                    </button>
                  </div>
                </div>

                {state.activeTab === "comments" && (
                  <IssueCommentsSection
                    commentsList={state.commentsList}
                    onPostComment={state.handlePostComment}
                    onToggleReaction={state.handleToggleCommentReaction}
                    issueId={issue.id}
                    members={mentionMembers}
                  />
                )}

                {state.activeTab === "history" && (
                  <div className="flex flex-col gap-2 divide-y divide-border/40">
                    {state.historyList.length === 0 ? (
                      <p className="text-xs text-text-subtle italic py-2">No history recorded yet.</p>
                    ) : (
                      state.historyList.map((h: any) => (
                        <div key={h.id} className="py-2 flex items-center gap-2 text-xs text-text-subtle">
                          <Avatar name={h.author?.name || "User"} src={h.author?.avatarUrl} size={20} />
                          <span className="font-bold text-text">{h.author?.name || "User"}</span>
                          <span>updated</span>
                          <span className="font-semibold text-text">{h.field}</span>
                          {h.oldValue && (
                            <span>
                              from <strong className="font-mono bg-neutral px-1.5 rounded text-text">{h.oldValue}</strong>
                            </span>
                          )}
                          {h.newValue && (
                            <span>
                              to <strong className="font-mono bg-selected text-selected-text px-1.5 rounded">{h.newValue}</strong>
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {state.activeTab === "worklog" && (
                  <IssueWorkLogsSection
                    loggedHours={state.loggedHours}
                    estimateHours={state.estimateHours}
                    workLogsList={state.workLogsList}
                    isLoading={state.isLoadingDetail}
                    onEstimateChange={state.setEstimateHours}
                    onEstimateBlur={state.handleEstimateBlur}
                    onLogWorkClick={() => state.setShowTimeModal(true)}
                  />
                )}

                {state.activeTab === "development" && (
                  <div className="flex flex-col gap-4">
                    <DevelopmentPanel
                      projectId={issue?.projectId || issue?.project?.id || ""}
                      issueKey={issue.key}
                      branches={state.devData.branches}
                      pullRequests={state.devData.pullRequests}
                      commits={state.devData.commits}
                    />
                  </div>
                )}
              </div>
            </div>

            <IssueSidebar
              issue={issue}
              onUpdateIssue={onUpdateIssue}
              availableUsers={availableUsers}
              isBlocked={isBlocked}
              activeBlockers={state.activeBlockers}
              currentStatus={state.currentStatus}
              handleStatusSelect={state.handleStatusSelect}
              handleWorkflowTransition={state.handleWorkflowTransition}
              handleAssigneeSelect={state.handleAssigneeSelect}
              handleTypeSelect={state.handleTypeSelect as any}
              handlePrioritySelect={state.handlePrioritySelect as any}
              estimateHours={state.estimateHours}
              setEstimateHours={state.setEstimateHours}
              handleEstimateBlur={state.handleEstimateBlur}
              loggedHours={state.loggedHours}
              estimatedHours={estimatedHoursStr}
              setShowTimeModal={state.setShowTimeModal}
              setActiveTab={state.setActiveTab}
              devData={state.devData}
              showToast={state.showToast}
            />
          </div>
        </div>
      </div>
    </>
  );
}
