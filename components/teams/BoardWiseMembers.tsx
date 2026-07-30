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
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  addProjectMemberAction,
  updateProjectMemberRoleAction,
  removeProjectMemberAction,
} from "@/app/(app)/projects/[key]/settings/actions";

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

export type BoardItem = {
  id: string;
  name: string;
  key: string;
  type: string;
  leadId: string;
  lead: BoardMemberUser;
  members: BoardMemberItem[];
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
  currentUserId?: string;
  isWorkspaceAdmin?: boolean;
}

export function BoardWiseMembers({
  boards: initialBoards,
  workspaceUsers,
  currentUserId,
  isWorkspaceAdmin = false,
}: BoardWiseMembersProps) {
  const [boards, setBoards] = useState<BoardItem[]>(initialBoards);
  const [selectedBoardId, setSelectedBoardId] = useState<string>(
    initialBoards[0]?.id || ""
  );
  const [boardSearch, setBoardSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState("");
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<
    "ADMIN" | "MEMBER" | "VIEWER"
  >("MEMBER");
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(
    null
  );
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

  // Candidate workspace users not yet in the current board
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

    // Optimistic UI update
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
      const res = await updateProjectMemberRoleAction(
        boardId,
        userId,
        newRole
      );
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

    // Optimistic UI update
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
        setIsAddModalOpen(false);
        setSelectedUserIdToAdd("");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 mt-4">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 shadow-xl text-xs font-semibold animate-scale-in flex items-center gap-2 ${
            toast.error
              ? "bg-red-600 text-white"
              : "bg-emerald-600 text-white"
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
              Scope Control
            </span>
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <FolderKanban className="text-brand" size={20} /> Board-Wise Members
            </h2>
          </div>
          <p className="text-xs text-text-subtle">
            Manage board user scopes, board creators, and explicit project roles. Users see and are assignable only to boards where they hold explicit membership.
          </p>
        </div>

        {currentBoard && (
          <Button
            appearance="primary"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-brand text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
          >
            <UserPlus size={14} /> Add Board Member
          </Button>
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
            <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredBoards.map((b) => {
                const isSelected = b.id === selectedBoardId;
                const adminCount = b.members.filter((m) => m.role === "ADMIN").length;

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
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral text-text-subtle flex items-center gap-1">
                        <Users size={10} /> {b.members.length} members
                      </span>
                      {adminCount > 0 && (
                        <span className="text-[9px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-1.5 rounded">
                          {adminCount} Admin{adminCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Board Members Details */}
          {currentBoard && (
            <div className="lg:col-span-8 flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-xs">
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

              {/* Members List */}
              <div className="flex flex-col gap-2">
                {filteredBoardMembers.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-lg bg-neutral/20">
                    <Users size={24} className="mx-auto text-text-subtle opacity-60 mb-2" />
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
                          {/* Role Selector */}
                          <div className="relative">
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
                          </div>

                          {/* Remove Button */}
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
          )}
        </div>
      )}

      {/* Add Member to Board Modal */}
      {isAddModalOpen && currentBoard && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface rounded-xl border border-border shadow-2xl p-6 flex flex-col gap-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <UserPlus size={16} className="text-brand" /> Add Member to Board ({currentBoard.key})
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-text-subtle hover:text-text text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-text-subtle">
              Select a workspace user to grant access and assignability on the <strong>{currentBoard.name}</strong> board.
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
                onClick={() => setIsAddModalOpen(false)}
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
