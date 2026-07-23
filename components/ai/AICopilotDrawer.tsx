"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, User, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { submitCopilotCommandAction } from "@/app/(app)/ai/actions";

type Message = {
  sender: "user" | "agent";
  text: string;
  success?: boolean;
};

const SUGGESTIONS = [
  'create issue "Fix mobile navigation alignment" as bug',
  'move DEMO-3 to IN_PROGRESS',
  'assign DEMO-3 to teammate',
  'comment on DEMO-3 "Ready for peer review"',
];

export function AICopilotDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "agent",
      text: "Hello! I am your autonomous Trackly AI Agent. I have full knowledge of the workspace. Tell me what to do, like: create issues, update statuses, assign members, post comments, or manage sprints.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendCommand = async (commandText = input) => {
    if (!commandText.trim()) return;

    setMessages((prev) => [...prev, { sender: "user", text: commandText }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await submitCopilotCommandAction(commandText);
      setMessages((prev) => [
        ...prev,
        { sender: "agent", text: res.message, success: res.success },
      ]);
      if (res.success) {
        // Reload active page to capture state transitions immediately
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { sender: "agent", text: "Error executing command.", success: false },
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
        className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-brand px-4 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <Sparkles size={16} /> AI Copilot
      </button>

      {/* Sliding Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs">
          <div className="w-[450px] h-full bg-surface shadow-2xl border-l border-border flex flex-col animate-in slide-in-from-right duration-250">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-brand text-white">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="animate-pulse" />
                <div>
                  <h3 className="font-bold text-sm">Trackly AI Copilot</h3>
                  <p className="text-[10px] opacity-80">Autonomous Workspace Agent</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Message History Feed */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-surface-sunken">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 max-w-[85%] ${
                    m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${
                      m.sender === "user" ? "bg-brand" : "bg-neutral text-default"
                    }`}
                  >
                    {m.sender === "user" ? <User size={14} /> : <Bot size={14} />}
                  </div>

                  <div className="flex flex-col gap-1">
                    <div
                      className={`rounded-ds p-3 text-xs shadow-xs leading-relaxed ${
                        m.sender === "user"
                          ? "bg-brand text-white"
                          : "bg-surface text-text border border-border"
                      }`}
                    >
                      {m.text}
                    </div>

                    {m.sender === "agent" && m.success !== undefined && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold">
                        {m.success ? (
                          <span className="flex items-center gap-0.5 text-success">
                            <CheckCircle size={10} /> Executed successfully
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-danger">
                            <AlertCircle size={10} /> Execution failed
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 mr-auto items-center max-w-[85%]">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral text-default">
                    <Bot size={14} />
                  </div>
                  <div className="rounded-ds p-3 bg-surface border border-border text-xs text-text-subtle animate-pulse">
                    AI is parsing and executing command...
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions Footer */}
            <div className="p-3 border-t border-border/60 bg-surface flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-text-subtle uppercase">Suggestions</span>
              <div className="flex flex-col gap-1">
                {SUGGESTIONS.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendCommand(sug)}
                    className="text-left rounded-ds bg-neutral px-2.5 py-1.5 text-xs text-default hover:bg-selected hover:text-brand transition-colors truncate"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Command Input Area */}
            <div className="p-4 border-t border-border bg-surface flex gap-2">
              <input
                type="text"
                placeholder="Ask AI to create, update, or transition status..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendCommand()}
                className="flex-1 h-9 rounded-ds border-2 border-border px-3 text-xs outline-none focus:border-brand"
              />
              <Button
                appearance="primary"
                onClick={() => handleSendCommand()}
                disabled={isLoading || !input.trim()}
                className="h-9 w-9 p-0 flex items-center justify-center shrink-0"
              >
                <Send size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
