"use client";

import { useState } from "react";
import { Building2, ShieldCheck, Lock, Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { updateDomainSettingsAction } from "@/app/(app)/settings/members/actions";

export function DomainSettingsCard({
  siteId,
  initialRestrictedDomain,
  initialAllowedDomain,
}: {
  siteId: string;
  initialRestrictedDomain: boolean;
  initialAllowedDomain: string | null;
}) {
  const [restrictedDomain, setRestrictedDomain] = useState(initialRestrictedDomain);
  const [allowedDomain, setAllowedDomain] = useState(initialAllowedDomain || "");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSavedSuccess(false);

    const res = await updateDomainSettingsAction(restrictedDomain, allowedDomain);
    setIsSaving(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-border-default bg-surface p-4 sm:p-5 max-w-3xl shadow-2xs">
      <div className="flex items-center justify-between border-b border-border-default pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <Building2 size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-default flex items-center gap-2">
              Company Email Domain Security
            </h3>
            <p className="text-xs text-subtle">
              Enforce corporate email access policies (Jira Cloud style domain claim & access controls)
            </p>
          </div>
        </div>
        {restrictedDomain && allowedDomain && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
            <Lock size={12} />
            Restricted to @{allowedDomain}
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 text-xs font-semibold text-default cursor-pointer">
            <input
              type="checkbox"
              checked={restrictedDomain}
              onChange={(e) => setRestrictedDomain(e.target.checked)}
              className="h-4 w-4 rounded border-border-default text-brand focus:ring-brand accent-brand cursor-pointer"
            />
            <span>
              Restrict workspace invitations to verified company email addresses only
            </span>
          </label>

          {restrictedDomain && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 pl-7 animate-in fade-in">
              <span className="text-xs text-subtle font-mono">Allowed Corporate Domain:</span>
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-xs font-mono text-subtle">@</span>
                <input
                  type="text"
                  required={restrictedDomain}
                  value={allowedDomain}
                  onChange={(e) => setAllowedDomain(e.target.value)}
                  placeholder="acmecorp.com"
                  className="h-9 px-3 rounded-lg border border-border-default bg-surface text-xs font-mono font-medium text-default outline-none focus:border-brand w-60"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs font-semibold text-danger">{error}</p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border-default">
          <p className="text-[11px] text-subtle">
            When enabled, users with addresses outside @{allowedDomain || "your-domain.com"} cannot be invited.
          </p>

          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={14} /> Saved Settings
              </span>
            )}
            <Button
              appearance="primary"
              type="submit"
              disabled={isSaving}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <Save size={14} />
              {isSaving ? "Saving..." : "Save Domain Policy"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
