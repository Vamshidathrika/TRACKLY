"use client";

import { useState, useTransition } from "react";
import { Key, Plus, Copy, Check, Trash2, ShieldCheck, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createApiKeyAction,
  revokeApiKeyAction,
  API_SCOPES,
  SCOPE_LABELS,
  SCOPE_PRESETS,
  type ApiKeySummary,
} from "./actions";

const EXPIRY_OPTIONS = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "1 year", days: 365 },
  { label: "No expiration", days: null as number | null },
];

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ApiKeysManager({
  initialKeys,
  isWorkspaceAdmin,
  currentUserId,
}: {
  initialKeys: ApiKeySummary[];
  isWorkspaceAdmin: boolean;
  currentUserId: string;
}) {
  const [keys, setKeys] = useState(initialKeys);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([...SCOPE_PRESETS[0].scopes]);
  const [expiryDays, setExpiryDays] = useState<number | null>(90);
  const [error, setError] = useState<string | null>(null);
  const [mintedToken, setMintedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  };

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      const res = await createApiKeyAction({
        name,
        scopes: selectedScopes,
        expiresInDays: expiryDays,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setKeys((prev) => [res.key, ...prev]);
      setMintedToken(res.token);
      setName("");
      setSelectedScopes([...SCOPE_PRESETS[0].scopes]);
      setShowCreate(false);
    });
  };

  const handleRevoke = (keyId: string) => {
    if (!confirm("Revoke this API key? Any integration using it will stop working immediately.")) return;
    setRevokingId(keyId);
    startTransition(async () => {
      const res = await revokeApiKeyAction(keyId);
      setRevokingId(null);
      if (res.success) {
        setKeys((prev) => prev.map((k) => (k.id === keyId ? { ...k, revokedAt: new Date() } : k)));
      } else if (res.error) {
        setError(res.error);
      }
    });
  };

  const copyToken = () => {
    if (!mintedToken) return;
    navigator.clipboard.writeText(mintedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      {mintedToken && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
            <AlertTriangle size={14} />
            Copy this token now — it will not be shown again
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-surface border border-border-default px-3 py-2 text-[12px] font-mono">
              {mintedToken}
            </code>
            <Button appearance="default" onClick={copyToken} className="gap-1.5 shrink-0">
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setMintedToken(null)}
            className="self-end text-[11px] text-subtle hover:text-default"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-subtle">
          {isWorkspaceAdmin
            ? "As a workspace admin you can see and revoke every key in this workspace."
            : "You can see and revoke your own keys."}
        </p>
        <Button appearance="primary" onClick={() => setShowCreate((v) => !v)} className="gap-1.5">
          <Plus size={14} /> New API Key
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-border-default bg-surface p-4 flex flex-col gap-4 shadow-2xs">
          <Input label="Name" placeholder="CI pipeline" value={name} onChange={(e) => setName(e.target.value)} />

          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-subtle">Scopes</span>
            <div className="flex flex-wrap gap-2 mb-1">
              {SCOPE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedScopes([...preset.scopes])}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-neutral hover:bg-neutral-hovered text-default border border-border-default"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {API_SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-[12px] text-default cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="rounded border-border-default"
                  />
                  {SCOPE_LABELS[scope]}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-subtle">Expiration</span>
            <div className="flex flex-wrap gap-2">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setExpiryDays(opt.days)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                    expiryDays === opt.days
                      ? "bg-brand/10 border-brand text-brand"
                      : "bg-neutral hover:bg-neutral-hovered text-default border-border-default"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[12px] text-danger font-medium">{error}</p>}

          <div className="flex items-center gap-2 justify-end">
            <Button appearance="subtle" onClick={() => setShowCreate(false)} className="gap-1">
              <X size={14} /> Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleCreate}
              disabled={isPending || !name.trim() || selectedScopes.length === 0}
            >
              {isPending ? "Creating…" : "Create Key"}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border-default bg-surface overflow-hidden shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-default bg-neutral/40 font-semibold text-subtle">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Token</th>
              <th className="px-4 py-3">Scopes</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Last used</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {keys.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-subtle">
                  <Key size={20} className="mx-auto mb-2 opacity-40" />
                  No API keys yet.
                </td>
              </tr>
            )}
            {keys.map((key) => {
              const isRevoked = Boolean(key.revokedAt);
              const isExpired = key.expiresAt ? new Date(key.expiresAt) < new Date() : false;
              const isMine = key.userId === currentUserId;
              const canRevoke = isWorkspaceAdmin || isMine;

              return (
                <tr key={key.id} className={`hover:bg-neutral/30 transition-colors ${isRevoked ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-semibold text-default">{key.name}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-subtle">{key.tokenPrefix}…</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.slice(0, 2).map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-neutral text-[10px] font-mono">
                          {s}
                        </span>
                      ))}
                      {key.scopes.length > 2 && (
                        <span className="px-1.5 py-0.5 rounded bg-neutral text-[10px]">+{key.scopes.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-subtle text-[11px]">{formatDate(key.createdAt)}</td>
                  <td className="px-4 py-3 text-subtle text-[11px]">{formatDate(key.lastUsedAt)}</td>
                  <td className="px-4 py-3 text-subtle text-[11px]">{formatDate(key.expiresAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {isRevoked ? (
                      <span className="text-[10px] font-semibold text-danger">Revoked</span>
                    ) : isExpired ? (
                      <span className="text-[10px] font-semibold text-subtle">Expired</span>
                    ) : canRevoke ? (
                      <button
                        type="button"
                        onClick={() => handleRevoke(key.id)}
                        disabled={revokingId === key.id}
                        className="p-1.5 rounded-lg text-subtlest hover:text-danger hover:bg-danger/10 transition-all cursor-pointer disabled:opacity-50"
                        title="Revoke key"
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-subtle">
                        <ShieldCheck size={11} /> Active
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
