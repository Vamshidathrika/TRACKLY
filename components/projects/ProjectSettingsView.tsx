"use client";

import { useState } from "react";
import { Settings, Plus, Trash2, CheckCircle2, Sliders, Layers, UserCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { DeleteProjectModal } from "@/components/projects/DeleteProjectModal";
import {
  updateProjectDetailsAction,
  createCustomFieldAction,
  deleteCustomFieldAction,
} from "@/app/(app)/projects/[key]/settings/actions";

export type CustomFieldItem = {
  id: string;
  name: string;
  fieldType: string;
  required: boolean;
};

export type ComponentItem = {
  id: string;
  name: string;
  description: string;
  leadName: string;
};

export function ProjectSettingsView({
  project,
  customFields: initialCustomFields,
}: {
  project: { id: string; name: string; key: string; type?: string; lead: { name: string } };
  customFields: CustomFieldItem[];
}) {
  const [activeTab, setActiveTab] = useState<"general" | "custom_fields" | "components" | "danger">("general");
  const [name, setName] = useState(project.name);
  const [key, setKey] = useState(project.key);
  const [projectType, setProjectType] = useState<"KANBAN" | "SCRUM">((project.type as any) || "KANBAN");
  const [defaultAssignee, setDefaultAssignee] = useState<"UNASSIGNED" | "PROJECT_LEAD">("UNASSIGNED");
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [customFields, setCustomFields] = useState<CustomFieldItem[]>(initialCustomFields);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState("STRING");
  const [isRequired, setIsRequired] = useState(false);
  const [isAddingField, setIsAddingField] = useState(false);

  // Components State
  const [components, setComponents] = useState<ComponentItem[]>([
    { id: "c1", name: "Frontend & UI", description: "Next.js pages, Tailwind styling, and React components", leadName: project.lead.name },
    { id: "c2", name: "Backend & API", description: "Prisma models, API routes, and Server Actions", leadName: project.lead.name },
    { id: "c3", name: "Integrations & Webhooks", description: "GitHub, Snyk, PostHog, and Opsgenie connectors", leadName: project.lead.name },
  ]);
  const [compName, setCompName] = useState("");
  const [compDesc, setCompDesc] = useState("");

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    setGeneralError(null);
    const res = await updateProjectDetailsAction(project.id, name, key, projectType);
    setIsSavingGeneral(false);
    if (res && res.error) {
      setGeneralError(res.error);
    } else {
      setGeneralSuccess(true);
      setTimeout(() => setGeneralSuccess(false), 3000);
    }
  };

  const handleAddCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName.trim()) return;

    setIsAddingField(true);
    const res = await createCustomFieldAction(project.id, fieldName, fieldType, isRequired);
    if (res && res.field) {
      setCustomFields((prev) => [...prev, res.field]);
      setFieldName("");
    }
    setIsAddingField(false);
  };

  const handleDeleteField = async (fieldId: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== fieldId));
    await deleteCustomFieldAction(fieldId);
  };

  const handleCreateComponent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim()) return;
    const newComp: ComponentItem = {
      id: `comp-${Date.now()}`,
      name: compName.trim(),
      description: compDesc.trim() || "No description provided",
      leadName: project.lead.name,
    };
    setComponents((prev) => [...prev, newComp]);
    setCompName("");
    setCompDesc("");
  };

  const handleDeleteComponent = (id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {[
          { id: "general", label: "General Details", icon: Settings },
          { id: "components", label: "Components & Sub-systems", icon: Layers },
          { id: "custom_fields", label: "Custom Fields", icon: Sliders },
          { id: "danger", label: "Danger Zone", icon: AlertTriangle },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === id
                ? id === "danger"
                  ? "bg-danger text-white shadow-2xs font-bold"
                  : "bg-brand text-white shadow-2xs font-bold"
                : "border border-border-default bg-surface text-default hover:bg-neutral"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* GENERAL SETTINGS TAB */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveGeneral} className="flex flex-col gap-5 rounded-xl border border-border-default bg-surface p-6 shadow-xs">
          <div className="border-b border-border-default pb-3">
            <h3 className="text-base font-bold text-default">Project Identity & Rules</h3>
            <p className="text-xs text-subtle">Manage project keys, default assignment behavior, and project leadership</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-subtle">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 rounded-lg border border-border-default bg-surface px-3 text-xs font-medium text-default outline-none focus:border-brand"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-subtle">Project Key</label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                className="h-9 rounded-lg border border-border-default bg-surface px-3 font-mono text-xs font-bold uppercase outline-none focus:border-brand"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-subtle">Project Type</label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as any)}
                className="h-9 rounded-lg border border-border-default bg-surface px-3 text-xs font-medium text-default outline-none focus:border-brand cursor-pointer"
              >
                <option value="KANBAN">Kanban (Continuous flow)</option>
                <option value="SCRUM">Scrum (Sprint-based)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-subtle">Project Lead</label>
              <input
                type="text"
                disabled
                value={project.lead.name}
                className="h-9 rounded-lg border border-border-default bg-neutral px-3 text-xs font-medium text-subtle cursor-not-allowed"
              />
            </div>
          </div>

          {generalError && <p className="text-xs font-medium text-danger">{generalError}</p>}

          <div className="flex items-center gap-3 pt-2">
            <Button appearance="primary" type="submit" disabled={isSavingGeneral}>
              Save changes
            </Button>
            {generalSuccess && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                <CheckCircle2 size={14} /> Saved successfully!
              </span>
            )}
          </div>
        </form>
      )}


      {/* COMPONENTS TAB */}
      {activeTab === "components" && (
        <div className="flex flex-col gap-6">
          {/* Create Component Form */}
          <form onSubmit={handleCreateComponent} className="flex flex-col gap-3 rounded-xl border border-brand/40 bg-brand/5 p-5 shadow-xs">
            <h3 className="font-bold text-xs text-default flex items-center gap-1.5">
              <Plus size={15} className="text-brand" /> Create Component / Sub-system
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-subtle">Component Name</label>
                <input
                  type="text"
                  placeholder="e.g. Auth System, Billing Module..."
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="h-8 rounded-lg border border-border-default bg-surface px-3 text-xs outline-none focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-subtle">Description</label>
                <input
                  type="text"
                  placeholder="Brief description of responsibilities..."
                  value={compDesc}
                  onChange={(e) => setCompDesc(e.target.value)}
                  className="h-8 rounded-lg border border-border-default bg-surface px-3 text-xs outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button appearance="primary" type="submit" disabled={!compName.trim()} className="h-8 text-xs">
                Add Component
              </Button>
            </div>
          </form>

          {/* Component List */}
          <div className="rounded-xl border border-border-default bg-surface overflow-hidden shadow-2xs">
            <div className="p-3 border-b border-border-default bg-neutral/40 flex items-center justify-between">
              <span className="text-xs font-bold text-subtle">
                Project Components ({components.length})
              </span>
            </div>

            <div className="divide-y divide-border-default text-xs">
              {components.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between gap-4 hover:bg-neutral/30 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-default">{c.name}</h4>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand px-2 py-0.5 rounded-full bg-brand/10">
                        <UserCheck size={11} /> Lead: {c.leadName}
                      </span>
                    </div>
                    <p className="text-subtle text-[11px]">{c.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteComponent(c.id)}
                    className="p-1.5 rounded-lg text-subtlest hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                    title="Delete Component"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM FIELDS TAB */}
      {activeTab === "custom_fields" && (
        <div className="flex flex-col gap-6">
          {/* Add Custom Field Form */}
          <form onSubmit={handleAddCustomField} className="flex flex-col gap-4 rounded-xl border border-brand/40 bg-brand/5 p-5 shadow-xs">
            <h3 className="font-bold text-xs text-default flex items-center gap-1.5">
              <Plus size={15} className="text-brand" /> Add Custom Field
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-subtle">Field Name</label>
                <input
                  type="text"
                  placeholder="e.g. Environment, Customer ID"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  className="h-8 rounded-lg border border-border-default bg-surface px-3 text-xs outline-none focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-subtle">Field Type</label>
                <select
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value)}
                  className="h-8 rounded-lg border border-border-default bg-surface px-2 text-xs outline-none focus:border-brand cursor-pointer"
                >
                  <option value="STRING">Text String</option>
                  <option value="NUMBER">Number</option>
                  <option value="DATE">Date</option>
                </select>
              </div>

              <div className="flex items-end mb-1">
                <label className="flex items-center gap-2 text-xs font-bold text-default cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                    className="rounded border-border-default text-brand"
                  />
                  Required Field
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button appearance="primary" type="submit" disabled={isAddingField} className="h-8 text-xs">
                Add Field
              </Button>
            </div>
          </form>

          {/* Custom Fields Table */}
          <div className="rounded-xl border border-border-default bg-surface overflow-hidden shadow-2xs">
            <div className="p-3 border-b border-border-default bg-neutral/40">
              <span className="text-xs font-bold text-subtle">
                Project Custom Fields ({customFields.length})
              </span>
            </div>

            {customFields.length === 0 ? (
              <div className="p-6 text-center text-xs text-subtle italic">
                No custom fields defined for this project.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-default text-subtle font-bold">
                    <th className="p-3">Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Required</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {customFields.map((field) => (
                    <tr key={field.id} className="hover:bg-neutral/30">
                      <td className="p-3 font-bold text-default">{field.name}</td>
                      <td className="p-3">
                        <Tag color="blue">{field.fieldType}</Tag>
                      </td>
                      <td className="p-3">
                        {field.required ? (
                          <Tag color="green">Yes</Tag>
                        ) : (
                          <Tag color="gray">No</Tag>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteField(field.id)}
                          className="rounded-lg p-1.5 text-subtlest hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                          title="Delete Field"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* DANGER ZONE TAB */}
      {activeTab === "danger" && (
        <div className="flex flex-col gap-5 rounded-xl border border-danger/30 bg-danger/5 p-6 shadow-xs">
          <div className="border-b border-danger/20 pb-3">
            <h3 className="text-base font-bold text-danger flex items-center gap-2">
              <AlertTriangle size={18} /> Delete Project
            </h3>
            <p className="text-xs text-subtle mt-1">
              Permanently delete this project and all of its data. This action is irreversible.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-xs font-semibold text-default">Delete this project</p>
              <p className="text-[11px] text-subtle">
                Once deleted, all issues, sprints, and custom fields associated with key <strong className="font-mono text-danger">{project.key}</strong> will be destroyed.
              </p>
            </div>
            <DeleteProjectModal
              projectId={project.id}
              projectKey={project.key}
              projectName={project.name}
            />
          </div>
        </div>
      )}
    </div>
  );
}

