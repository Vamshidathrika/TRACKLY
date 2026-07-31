"use client";

import { useState, useTransition } from "react";
import {
  FolderKanban,
  UserPlus,
  Crown,
  Trash2,
  Users,
  Search,
  CheckCircle2,
  Briefcase,
  Plus,
  Shield,
  Layers,
  UserCheck,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  addProjectMemberAction,
  updateProjectMemberRoleAction,
  removeProjectMemberAction,
} from "@/app/(app)/projects/[key]/settings/actions";
import {
  createTeamAction,
  addTeamToBoardAction,
  removeTeamFromBoardAction,
} from "@/app/(app)/teams/actions";

export type BoardMemberUser = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
};

export type BoardMemberItem = {
  id: string;
  userId: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  user: BoardMemberUser;
};

export type TeamUser = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
};

export type TeamMemberData = {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  user: TeamUser;
};

export type TeamData = {
  id: string;
  siteId: string;
  name: string;
  description?: string | null;
  leadId?: string | null;
  lead?: TeamUser | null;
  members: TeamMemberData[];
  projectIds?: string[];
};

export type BoardItem = {
  id: string;
  name: string;
  key: string;
  type: string;
  leadId: string;
  lead: BoardMemberUser;
  members: BoardMemberItem[];
  teams?: TeamData[];
};

export type WorkspaceUserItem = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
};

interface BoardWiseMembersProps {
  boards: BoardItem[];
  workspaceUsers: WorkspaceUserItem[];
  workspaceTeams?: TeamData[];
  currentUserId?: string;
  isWorkspaceAdmin?: boolean;
}

export function BoardWiseMembers({
  boards: initialBoards,
  workspaceUsers,
  workspaceTeams: initialWorkspaceTeams = [],
  currentUserId,
  isWorkspaceAdmin = false,
}: BoardWiseMembersProps) {
  const [boards, setBoards] = useState<BoardItem[]>(initialBoards);
  const [workspaceTeams, setWorkspaceTeams] = useState<TeamData[]>(initialWorkspaceTeams);
  const [selectedBoardId, setSelectedBoardId] = useState<string>(
    initialBoards[0]?.id || ""
  );
  const [boardSearch, setBoardSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  // Member Modal State
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState("");
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<
    "ADMIN" | "MEMBER" | "VIEWER"
  >("MEMBER");

  // Team Modal State
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);
  const [addTeamTab, setAddTeamTab] = useState<"link" | "create">("link");
  const [selectedTeamIdToLink, setSelectedTeamIdToLink] = useState("");
  
  // New Team Form State
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [newTeamLeadId, setNewTeamLeadId] = useState(currentUserId || "");
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<string[]>([]);

  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3500);
  };

  const currentBoard = boards.find((b) => b.id === selectedBoardId);

  const filteredBoards = boards.filter(
    (b) =>
      b.name.toLowerCase().includes(boardSearch.toLowerCase()) ||
      b.key.toLowerCase().includes(boardSearch.toLowerCase())
  );

  const filteredBoardMembers = currentBoard
    ? currentBoard.members.filter(
        (m) =>
          (m.user.name || "")
            .toLowerCase()
            .includes(memberSearch.toLowerCase()) ||
          m.user.email.toLowerCase().includes(memberSearch.toLowerCase())
      )
    : [];

  // Current Board's Teams
  const boardTeams = currentBoard
    ? currentBoard.teams || workspaceTeams.filter((t) => t.projectIds?.includes(currentBoard.id))
    : [];

  // Workspace teams available to link to this board (not yet linked)
  const availableTeamsToLink = currentBoard
    ? workspaceTeams.filter(
        (wt) => !boardTeams.some((bt) => bt.id === wt.id)
      )
    : [];

  // Workspace users not yet in current board directly
  const nonBoardUsers = currentBoard
    ? workspaceUsers.filter(
        (wu) => !currentBoard.members.some((m) => m.userId === wu.id)
      )
    : [];

  const handleRoleChange = (
    userId: string,
    newRole: "ADMIN" | "MEMBER" | "VIEWER"
  ) => {
    if (!currentBoard) return;
    const boardId = currentBoard.id;

    setBoards((prev) =>
      prev.map((b) => {
        if (b.id !== boardId) return b;
        return {
          ...b,
          members: b.members.map((m) =>
            m.userId === userId ? { ...m, role: newRole } : m
          ),
        };
      })
    );

    startTransition(async () => {
      const res = await updateProjectMemberRoleAction(boardId, userId, newRole);
      if (res?.error) {
        showToast(res.error, true);
      } else {
        showToast(`Role updated to ${newRole} for user.`);
      }
    });
  };

  const handleRemoveMember = (userId: string, userName: string) => {
    if (!currentBoard) return;
    if (
      !confirm(
        `Are you sure you want to remove ${userName} from the board ${currentBoard.name} (${currentBoard.key})?`
      )
    ) {
      return;
    }

    const boardId = currentBoard.id;

    setBoards((prev) =>
      prev.map((b) => {
        if (b.id !== boardId) return b;
        return {
          ...b,
          members: b.members.filter((m) => m.userId !== userId),
        };
      })
    );

    startTransition(async () => {
      const res = await removeProjectMemberAction(boardId, userId);
      if (res?.error) {
        showToast(res.error, true);
      } else {
        showToast(`${userName} removed from ${currentBoard.key} board.`);
      }
    });
  };

  const handleAddMember = () => {
    if (!currentBoard || !selectedUserIdToAdd) return;
    const boardId = currentBoard.id;
    const userObj = workspaceUsers.find((u) => u.id === selectedUserIdToAdd);
    if (!userObj) return;

    startTransition(async () => {
      const res = await addProjectMemberAction(
        boardId,
        selectedUserIdToAdd,
        selectedRoleToAdd
      );
      if (res?.error) {
        showToast(res.error, true);
      } else {
        setBoards((prev) =>
          prev.map((b) => {
            if (b.id !== boardId) return b;
            const newMember: BoardMemberItem = {
              id: res.member?.id || `temp-${Date.now()}`,
              userId: selectedUserIdToAdd,
              role: selectedRoleToAdd,
              user: userObj,
            };
            return {
              ...b,
              members: [...b.members, newMember],
            };
          })
        );
        showToast(`${userObj.name || userObj.email} added to ${currentBoard.key}.`);
        setIsAddMemberModalOpen(false);
        setSelectedUserIdToAdd("");
      }
    });
  };

  const handleLinkTeamToBoard = () => {
    if (!currentBoard || !selectedTeamIdToLink) return;
    const boardId = currentBoard.id;
    const teamObj = workspaceTeams.find((t) => t.id === selectedTeamIdToLink);
    if (!teamObj) return;

    startTransition(async () => {
      const res = await addTeamToBoardAction(boardId, selectedTeamIdToLink);
      if (res?.error) {
        showToast(res.error, true);
      } else {
        // Update local boards state
        setBoards((prev) =>
          prev.map((b) => {
            if (b.id !== boardId) return b;
            const existingTeams = b.teams || [];
            return {
              ...b,
              teams: [...existingTeams, teamObj],
            };
          })
        );
        showToast(`Team "${teamObj.name}" linked to ${currentBoard.key} board.`);
        setIsAddTeamModalOpen(false);
        setSelectedTeamIdToLink("");
      }
    });
  };

  const handleCreateAndAttachTeam = () => {
    if (!currentBoard || !newTeamName.trim()) return;

    startTransition(async () => {
      const res = await createTeamAction({
        name: newTeamName,
        description: newTeamDescription,
        leadId: newTeamLeadId || currentUserId,
        memberUserIds: selectedTeamMemberIds,
        projectId: currentBoard.id,
      });

      if (res?.error) {
        showToast(res.error, true);
      } else if (res?.team) {
        const leadUser = workspaceUsers.find((u) => u.id === (newTeamLeadId || currentUserId));
        const createdTeam: TeamData = {
          id: res.team.id,
          siteId: res.team.siteId,
          name: res.team.name,
          description: res.team.description,
          leadId: res.team.leadId,
          lead: leadUser || null,
          members: selectedTeamMemberIds.map((uId) => ({
            id: `tm-${uId}`,
            teamId: res.team.id,
            userId: uId,
            role: uId === (newTeamLeadId || currentUserId) ? "LEAD" : "MEMBER",
            user: workspaceUsers.find((u) => u.id === uId) || { id: uId, name: "User", email: "" },
          })),
          projectIds: [currentBoard.id],
        };

        setWorkspaceTeams((prev) => [createdTeam, ...prev]);
        setBoards((prev) =>
          prev.map((b) => {
            if (b.id !== currentBoard.id) return b;
            return {
              ...b,
              teams: [...(b.teams || []), createdTeam],
            };
          })
        );

        showToast(`Team "${createdTeam.name}" created and added to ${currentBoard.key}!`);
        setIsAddTeamModalOpen(false);
        setNewTeamName("");
        setNewTeamDescription("");
        setSelectedTeamMemberIds([]);
      }
    });
  };

  const handleRemoveTeamFromBoard = (teamId: string, teamName: string) => {
    if (!currentBoard) return;
    if (!confirm(`Are you sure you want to remove team "${teamName}" from board ${currentBoard.key}?`)) {
      return;
    }

    startTransition(async () => {
      const res = await removeTeamFromBoardAction(currentBoard.id, teamId);
      if (res?.error) {
        showToast(res.error, true);
      } else {
        setBoards((prev) =>
          prev.map((b) => {
            if (b.id !== currentBoard.id) return b;
            return {
              ...b,
              teams: (b.teams || []).filter((t) => t.id !== teamId),
            };
          })
        );
        showToast(`Team "${teamName}" removed from board ${currentBoard.key}.`);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 mt-4">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 shadow-xl text-xs font-semibold animate-scale-in flex items-center gap-2 ${
            toast.error ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
          }`}
        >
          <CheckCircle2 size={16} />
          {toast.msg}
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-brand/5 via-purple-500/5 to-transparent p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand/10 text-brand">
              Jira Parity
            </span>
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <FolderKanban className="text-brand" size={20} /> Board-Wise Teams & Members
            </h2>
          </div>
          <p className="text-xs text-text-subtle">
            Manage board-level team scopes, team leads, and member role permissions. Link named teams or individual members to boards.
          </p>
        </div>

        {currentBoard && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              appearance="subtle"
              onClick={() => setIsAddTeamModalOpen(true)}
              className="border border-border text-text text-xs font-bold flex items-center gap-1.5"
            >
              <Users size={14} className="text-brand" /> + Add Team to Board
            </Button>
            <Button
              appearance="primary"
              onClick={() => setIsAddMemberModalOpen(true)}
              className="bg-brand text-white text-xs font-bold flex items-center gap-1.5"
            >
              <UserPlus size={14} /> Add Direct Member
            </Button>
          </div>
        )}
      </div>

      {boards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <FolderKanban size={36} className="mx-auto text-text-subtle mb-3 opacity-50" />
          <h3 className="text-sm font-semibold text-text">No Boards Found</h3>
          <p className="text-xs text-text-subtle mt-1">
            Create a board first. New boards automatically grant ADMIN access to their creator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Board Picker List */}
          <div className="lg:col-span-4 flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                <FolderKanban size={15} className="text-brand" /> Workspace Boards ({boards.length})
              </span>
            </div>

            {/* Board Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-2.5 text-text-subtle" />
              <input
                type="text"
                placeholder="Search boards..."
                value={boardSearch}
                onChange={(e) => setBoardSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-md border border-border bg-neutral/30 text-xs outline-none focus:border-brand transition-all"
              />
            </div>

            {/* Board Cards */}
            <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredBoards.map((b) => {
                const isSelected = b.id === selectedBoardId;
                const adminCount = b.members.filter((m) => m.role === "ADMIN").length;
                const linkedTeams = b.teams || workspaceTeams.filter((t) => t.projectIds?.includes(b.id));

                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBoardId(b.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-brand bg-brand/5 shadow-xs"
                        : "border-border/60 bg-surface hover:border-brand/40 hover:bg-neutral/40"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-brand/10 text-brand text-[10px] font-bold tracking-wide shrink-0">
                          {b.key}
                        </span>
                        <h4 className="text-xs font-bold text-text truncate">{b.name}</h4>
                      </div>
                      <p className="text-[11px] text-text-subtle mt-1 flex items-center gap-1">
                        <Crown size={11} className="text-amber-500 shrink-0" />
                        <span className="truncate">Lead: {b.lead.name || b.lead.email}</span>
                      </p>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <div className="flex items-center gap-1">
                        {linkedTeams.length > 0 && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                            {linkedTeams.length} Team{linkedTeams.length > 1 ? "s" : ""}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral text-text-subtle flex items-center gap-1">
                          <Users size={10} /> {b.members.length}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Board Details */}
          {currentBoard && (
            <div className="lg:col-span-8 flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 shadow-xs">
              {/* Board Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-brand text-white">
                      {currentBoard.key}
                    </span>
                    <h3 className="text-base font-bold text-text">{currentBoard.name}</h3>
                  </div>
                  <p className="text-xs text-text-subtle mt-1 flex items-center gap-1.5">
                    <Crown size={13} className="text-amber-500" />
                    <span>
                      Board Creator & Lead: <strong>{currentBoard.lead.name || currentBoard.lead.email}</strong>
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-56">
                    <Search size={13} className="absolute left-3 top-2.5 text-text-subtle" />
                    <input
                      type="text"
                      placeholder="Search board members..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 rounded-md border border-border bg-neutral/30 text-xs outline-none focus:border-brand"
                    />
                  </div>
                </div>
              </div>

              {/* Section A: Teams Associated with This Board */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={15} className="text-purple-600" /> Teams Assigned to Board ({boardTeams.length})
                  </h4>
                  <button
                    onClick={() => setIsAddTeamModalOpen(true)}
                    className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} /> Add Team to {currentBoard.key}
                  </button>
                </div>

                {boardTeams.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-border bg-neutral/10 text-center">
                    <p className="text-xs text-text-subtle">
                      No Teams assigned to this board yet. Click <strong>"+ Add Team to Board"</strong> to attach a Team.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {boardTeams.map((team) => (
                      <div
                        key={team.id}
                        className="rounded-lg border border-purple-200/60 bg-gradient-to-br from-purple-500/5 to-transparent p-3.5 flex flex-col justify-between hover:border-purple-300 transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">
                                Board Team
                              </span>
                              <h5 className="text-sm font-bold text-text mt-1">{team.name}</h5>
                              {team.description && (
                                <p className="text-[11px] text-text-subtle line-clamp-1 mt-0.5">
                                  {team.description}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveTeamFromBoard(team.id, team.name)}
                              title="Remove Team from Board"
                              className="p-1 rounded hover:bg-red-50 text-text-subtle hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
                            <span className="text-text-subtle flex items-center gap-1">
                              <Crown size={11} className="text-amber-500" />
                              Lead: {team.lead?.name || team.lead?.email || "Unassigned"}
                            </span>
                            <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                              {team.members.length} members
                            </span>
                          </div>

                          {/* Member Avatars Stack */}
                          <div className="flex items-center gap-1 mt-2.5">
                            {team.members.slice(0, 5).map((tm) => (
                              <Avatar
                                key={tm.id}
                                name={tm.user.name || "Member"}
                                src={tm.user.avatarUrl}
                                size={22}
                              />
                            ))}
                            {team.members.length > 5 && (
                              <span className="text-[10px] font-bold text-text-subtle pl-1">
                                +{team.members.length - 5}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section B: Direct Board Members & Role Permissions */}
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck size={15} className="text-brand" /> Direct Board Members & Roles ({filteredBoardMembers.length})
                  </h4>
                  <button
                    onClick={() => setIsAddMemberModalOpen(true)}
                    className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} /> Add Direct Member
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {filteredBoardMembers.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-border rounded-lg bg-neutral/20">
                      <p className="text-xs font-semibold text-text-subtle">No members match your search on this board.</p>
                    </div>
                  ) : (
                    filteredBoardMembers.map((member) => {
                      const isCreator = member.userId === currentBoard.leadId;

                      return (
                        <div
                          key={member.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border/70 bg-surface hover:bg-neutral/30 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar name={member.user.name ?? "Member"} src={member.user.avatarUrl} size={36} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-text truncate">
                                  {member.user.name || "Workspace Member"}
                                </span>
                                {isCreator && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">
                                    <Crown size={10} /> Creator
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-text-subtle block truncate">
                                {member.user.email}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <select
                              value={member.role}
                              disabled={isPending}
                              onChange={(e) =>
                                handleRoleChange(
                                  member.userId,
                                  e.target.value as "ADMIN" | "MEMBER" | "VIEWER"
                                )
                              }
                              className={`h-7 px-2 pr-6 rounded-md text-[11px] font-bold border outline-none cursor-pointer transition-all ${
                                member.role === "ADMIN"
                                  ? "bg-purple-50 text-purple-700 border-purple-300"
                                  : member.role === "VIEWER"
                                  ? "bg-gray-50 text-gray-700 border-gray-300"
                                  : "bg-blue-50 text-blue-700 border-blue-300"
                              }`}
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="MEMBER">MEMBER</option>
                              <option value="VIEWER">VIEWER</option>
                            </select>

                            <button
                              disabled={isPending || isCreator}
                              onClick={() =>
                                handleRemoveMember(
                                  member.userId,
                                  member.user.name || member.user.email
                                )
                              }
                              title={
                                isCreator
                                  ? "Board creator cannot be removed"
                                  : "Remove member from board"
                              }
                              className={`p-1.5 rounded-md text-subtle transition-colors ${
                                isCreator
                                  ? "opacity-30 cursor-not-allowed"
                                  : "hover:bg-red-50 hover:text-red-600 cursor-pointer"
                              }`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Add Team to Board Modal */}
      {isAddTeamModalOpen && currentBoard && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface rounded-xl border border-border shadow-2xl p-6 flex flex-col gap-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <Users size={18} className="text-purple-600" /> Add Team to Board ({currentBoard.key})
              </h3>
              <button
                onClick={() => setIsAddTeamModalOpen(false)}
                className="text-text-subtle hover:text-text text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 border-b border-border">
              <button
                onClick={() => setAddTeamTab("link")}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  addTeamTab === "link"
                    ? "border-purple-600 text-purple-600 bg-purple-50"
                    : "border-transparent text-text-subtle hover:text-text"
                }`}
              >
                Link Existing Workspace Team
              </button>
              <button
                onClick={() => setAddTeamTab("create")}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  addTeamTab === "create"
                    ? "border-purple-600 text-purple-600 bg-purple-50"
                    : "border-transparent text-text-subtle hover:text-text"
                }`}
              >
                + Create New Team for Board
              </button>
            </div>

            {/* Tab 1: Link Existing Team */}
            {addTeamTab === "link" && (
              <div className="flex flex-col gap-3 py-2">
                <p className="text-xs text-text-subtle">
                  Select a Team from your workspace to associate with <strong>{currentBoard.name}</strong>.
                </p>

                {availableTeamsToLink.length === 0 ? (
                  <div className="p-3 bg-amber-50 rounded border border-amber-200 text-amber-800 text-xs">
                    No unlinked workspace teams available. Switch to <strong>"+ Create New Team for Board"</strong> to create one.
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold text-text-subtle uppercase mb-1 block">
                      Select Team
                    </label>
                    <select
                      value={selectedTeamIdToLink}
                      onChange={(e) => setSelectedTeamIdToLink(e.target.value)}
                      className="w-full h-9 rounded-md border border-border bg-surface px-3 text-xs outline-none focus:border-purple-600"
                    >
                      <option value="">-- Choose a Workspace Team --</option>
                      {availableTeamsToLink.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.members.length} members)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-3">
                  <Button
                    appearance="subtle"
                    onClick={() => setIsAddTeamModalOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    appearance="primary"
                    disabled={!selectedTeamIdToLink || isPending}
                    onClick={handleLinkTeamToBoard}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                  >
                    {isPending ? "Linking..." : "Link Team to Board"}
                  </Button>
                </div>
              </div>
            )}

            {/* Tab 2: Create New Team */}
            {addTeamTab === "create" && (
              <div className="flex flex-col gap-3 py-2">
                <div>
                  <label className="text-[11px] font-bold text-text-subtle uppercase mb-1 block">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Frontend Squad, DevOps Team, Mobile Devs"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-surface px-3 text-xs outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-text-subtle uppercase mb-1 block">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of team focus..."
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-surface px-3 text-xs outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-text-subtle uppercase mb-1 block">
                    Team Lead
                  </label>
                  <select
                    value={newTeamLeadId}
                    onChange={(e) => setNewTeamLeadId(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-surface px-3 text-xs outline-none focus:border-purple-600"
                  >
                    {workspaceUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-text-subtle uppercase mb-1.5 block">
                    Select Team Members ({selectedTeamMemberIds.length} selected)
                  </label>
                  <div className="max-h-36 overflow-y-auto border border-border rounded-md p-2 flex flex-col gap-1.5 bg-neutral/10">
                    {workspaceUsers.map((u) => {
                      const isChecked = selectedTeamMemberIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-surface text-xs cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTeamMemberIds((prev) => [...prev, u.id]);
                                } else {
                                  setSelectedTeamMemberIds((prev) => prev.filter((id) => id !== u.id));
                                }
                              }}
                              className="rounded border-border text-purple-600"
                            />
                            <span>{u.name || u.email}</span>
                          </div>
                          <span className="text-[10px] text-text-subtle">{u.email}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-2">
                  <Button
                    appearance="subtle"
                    onClick={() => setIsAddTeamModalOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    appearance="primary"
                    disabled={!newTeamName.trim() || isPending}
                    onClick={handleCreateAndAttachTeam}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                  >
                    {isPending ? "Creating..." : "Create & Attach Team"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 2: Add Direct Member to Board Modal */}
      {isAddMemberModalOpen && currentBoard && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface rounded-xl border border-border shadow-2xl p-6 flex flex-col gap-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <UserPlus size={16} className="text-brand" /> Add Direct Member to Board ({currentBoard.key})
              </h3>
              <button
                onClick={() => setIsAddMemberModalOpen(false)}
                className="text-text-subtle hover:text-text text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-text-subtle">
              Select a workspace user to grant individual access and assignability on the <strong>{currentBoard.name}</strong> board.
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold text-text-subtle uppercase mb-1 block">
                  Select User
                </label>
                {nonBoardUsers.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded border border-amber-200">
                    All workspace members are already members of this board.
                  </p>
                ) : (
                  <select
                    value={selectedUserIdToAdd}
                    onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-surface px-3 text-xs outline-none focus:border-brand"
                  >
                    <option value="">-- Choose a workspace user --</option>
                    {nonBoardUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name ? `${u.name} (${u.email})` : u.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-text-subtle uppercase mb-1 block">
                  Board Role
                </label>
                <select
                  value={selectedRoleToAdd}
                  onChange={(e) =>
                    setSelectedRoleToAdd(
                      e.target.value as "ADMIN" | "MEMBER" | "VIEWER"
                    )
                  }
                  className="w-full h-9 rounded-md border border-border bg-surface px-3 text-xs outline-none focus:border-brand"
                >
                  <option value="MEMBER">MEMBER (Can view, create & update tasks)</option>
                  <option value="ADMIN">ADMIN (Full board management & role privileges)</option>
                  <option value="VIEWER">VIEWER (Read-only access)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border mt-2">
              <Button
                appearance="subtle"
                onClick={() => setIsAddMemberModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                appearance="primary"
                disabled={!selectedUserIdToAdd || isPending}
                onClick={handleAddMember}
                className="bg-brand text-white text-xs font-bold"
              >
                {isPending ? "Adding..." : "Add to Board"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
