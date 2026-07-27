"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, Send, Bot, User, CheckCircle, AlertCircle, Cpu, Zap, FileCode, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { submitCopilotCommandAction } from "@/app/(app)/ai/actions";

type Message = {
  sender: "user" | "agent";
  text: string;
  success?: boolean;
  agentRole?: string;
};

const AGENT_MODES = [
  { id: "copilot", label: "General Copilot", icon: Sparkles, color: "text-brand" },
  { id: "creator", label: "Task Creator", icon: PlusIcon, color: "text-emerald-500" },
  { id: "triage", label: "Auto-Triage Agent", icon: Zap, color: "text-amber-500" },
  { id: "spec", label: "Spec Writer Agent", icon: CheckSquare, color: "text-purple-500" },
];

function PlusIcon({ size, className }: { size?: number; className?: string }) {
  return <Cpu size={size || 14} className={className} />;
}

const SUGGESTIONS_BY_MODE: Record<string, string[]> = {
  copilot: [
    'create task "Fix mobile navigation alignment" as bug fix',
    'move task to IN_PROGRESS',
    'assign task to team lead',
    'comment on task "Ready for peer review"',
  ],
  creator: [
    'create bug "OAuth callback 500 error on production login"',
    'create story "Add dark mode toggle to user settings panel"',
  ],
  triage: [
    'triage unassigned tasks in current project',
    'assign highest priority tasks to teammate',
  ],
  spec: [
    'generate acceptance criteria for current task',
    'decompose task into subtasks',
  ],
};

export function AICopilotDrawer({
  defaultProjectId,
  defaultIssueKey,
  onSuccess,
}: {
  defaultProjectId?: string;
  defaultIssueKey?: string;
  onSuccess?: () => void;
} = {}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<"copilot" | "creator" | "triage" | "spec">("copilot");
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "agent",
      text: "Hello! I am your autonomous Trackly Rovo AI Agent. I have full knowledge of the workspace. Select a specialized agent mode or tell me what to do!",
      agentRole: "Trackly Rovo Agent",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setInput("");
      setIsLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendCommand = async (commandText = input) => {
    if (!commandText.trim()) return;

    const currentAgentLabel = AGENT_MODES.find((m) => m.id === activeMode)?.label || "Rovo Agent";
    setMessages((prev) => [...prev, { sender: "user", text: commandText }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await submitCopilotCommandAction(commandText);
      setMessages((prev) => [
        ...prev,
        { sender: "agent", text: res.message, success: res.success, agentRole: currentAgentLabel },
      ]);
      if (res.success) {
        onSuccess?.();
        router.refresh();
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { sender: "agent", text: "Error executing command.", success: false, agentRole: currentAgentLabel },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Copilot Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-brand px-4 text-sm font-bold text-white shadow-xl transition-transform hover:scale-105 active:scale-95 border border-white/20"
      >
        <Sparkles size={18} className="animate-pulse text-amber-300" />
        <span>Rovo AI Agent</span>
      </button>

      {/* Sliding Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-md transition-opacity">
          <div className="w-full sm:w-[480px] max-w-full h-full bg-surface/95 backdrop-blur-2xl shadow-2xl border-l border-border-strong flex flex-col animate-in slide-in-from-right duration-250 select-none">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-brand via-indigo-600 to-brand-hovered text-white shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-white/15 text-amber-300 backdrop-blur-md border border-white/20">
                  <Sparkles size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight">Trackly Rovo AI Suite</h3>
                  <p className="text-[10px] opacity-85 font-medium">Autonomous Workspace Agents</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-1.5 hover:bg-white/15 transition-all active:scale-95 cursor-pointer text-white/90 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Specialized Agent Mode Selector Tabs */}
            <div className="flex items-center gap-1.5 p-2.5 bg-neutral/50 border-b border-border-default text-xs shrink-0 overflow-x-auto">
              {AGENT_MODES.map((mode) => {
                const Icon = mode.icon;
                const isActive = activeMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setActiveMode(mode.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "bg-surface text-brand shadow-xs border border-border-default"
                        : "text-subtle hover:text-default hover:bg-neutral"
                    }`}
                  >
                    <Icon size={13} className={mode.color} />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Message History Feed */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-surface-sunken/60">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 max-w-[90%] ${
                    m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div
                    className={`flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-xl text-white shadow-2xs ${
                      m.sender === "user" ? "bg-brand" : "bg-brand/10 text-brand border border-brand/25"
                    }`}
                  >
                    {m.sender === "user" ? <User size={14} /> : <Bot size={14} />}
                  </div>

                  <div className="flex flex-col gap-1">
                    {m.sender === "agent" && (
                      <span className="text-[10px] font-extrabold text-brand uppercase tracking-wider flex items-center gap-1">
                        <Bot size={11} /> {m.agentRole || "Rovo Agent"}
                      </span>
                    )}
                    <div
                      className={`rounded-2xl p-3.5 text-xs shadow-2xs leading-relaxed ${
                        m.sender === "user"
                          ? "bg-brand text-white font-medium"
                          : "bg-surface text-default border border-border-default"
                      }`}
                    >
                      {m.text}
                    </div>

                    {m.sender === "agent" && m.success !== undefined && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold pt-0.5">
                        {m.success ? (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle size={11} /> Executed successfully
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-danger">
                            <AlertCircle size={11} /> Action failed
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs font-bold text-brand animate-pulse p-2">
                  <Sparkles size={14} />
                  <span>Rovo Agent is reasoning...</span>
                </div>
              )}
            </div>

            {/* Mode-Based Quick Prompts Suggestions */}
            <div className="p-3 border-t border-border-default bg-surface flex flex-col gap-1.5 shrink-0">
              <span className="text-[10px] font-extrabold text-subtlest uppercase tracking-wider">
                {activeMode} Quick Prompts
              </span>
              <div className="flex flex-col gap-1.5">
                {(SUGGESTIONS_BY_MODE[activeMode] || SUGGESTIONS_BY_MODE.copilot).map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendCommand(sug)}
                    className="text-left rounded-xl bg-neutral/50 px-3 py-2 text-xs text-default hover:bg-brand/10 hover:text-brand transition-all truncate font-semibold border border-border-default cursor-pointer active:scale-[0.99]"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Command Input Area */}
            <div className="p-4 border-t border-border-default bg-surface flex gap-2 shrink-0">
              <input
                type="text"
                placeholder={`Ask ${AGENT_MODES.find((m) => m.id === activeMode)?.label}...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendCommand()}
                className="flex-1 h-10 rounded-xl border border-border-default px-3.5 text-xs outline-none focus:border-brand focus:ring-3 focus:ring-brand/10 bg-surface-sunken text-default font-medium placeholder:text-subtlest transition-all"
              />
              <Button
                appearance="primary"
                onClick={() => handleSendCommand()}
                disabled={isLoading || !input.trim()}
                className="h-10 w-10 p-0 flex items-center justify-center shrink-0 rounded-xl bg-brand text-white font-bold cursor-pointer hover:bg-brand-hovered active:scale-95 transition-all shadow-xs"
              >
                <Send size={15} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
