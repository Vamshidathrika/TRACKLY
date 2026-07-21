"use client";

import { useState } from "react";
import { Settings, Plus, Trash2, CheckCircle2, Sliders } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
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

export function ProjectSettingsView({
  project,
  customFields: initialCustomFields,
}: {
  project: { id: string; name: string; key: string; lead: { name: string } };
  customFields: CustomFieldItem[];
}) {
  const [activeTab, setActiveTab] = useState<"general" | "custom_fields">("general");
  const [name, setName] = useState(project.name);
  const [key, setKey] = useState(project.key);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState(false);

  const [customFields, setCustomFields] = useState<CustomFieldItem[]>(initialCustomFields);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState("STRING");
  const [isRequired, setIsRequired] = useState(false);
  const [isAddingField, setIsAddingField] = useState(false);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    await updateProjectDetailsAction(project.id, name, key);
    setIsSavingGeneral(false);
    setGeneralSuccess(true);
    setTimeout(() => setGeneralSuccess(false), 3000);
  };

  const handleAddCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName.trim()) return;

    setIsAddingField(true);
    await createCustomFieldAction(project.id, fieldName, fieldType, isRequired);
    window.location.reload();
  };

  const handleDeleteField = async (fieldId: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== fieldId));
    await deleteCustomFieldAction(fieldId);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {[
          { id: "general", label: "General Settings", icon: Settings },
          { id: "custom_fields", label: "Custom Fields", icon: Sliders },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 rounded-ds px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === id
                ? "bg-brand text-white"
                : "border border-border-default bg-surface text-default hover:bg-neutral-hovered"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* GENERAL SETTINGS TAB */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveGeneral} className="flex flex-col gap-5 rounded-ds border border-border bg-surface p-6 shadow-xs">
          <div className="border-b border-border pb-3">
            <h3 className="text-base font-semibold text-text">Project Details</h3>
            <p className="text-xs text-text-subtle">Manage project identity and details</p>
          </div>

          <div className="flex flex-col gap-1 max-w-md">
            <label className="text-xs font-semibold text-text-subtle">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 rounded-ds border border-border bg-surface px-3 text-sm outline-none focus:border-brand"
            />
          </div>

          <div className="flex flex-col gap-1 max-w-md">
            <label className="text-xs font-semibold text-text-subtle">Project Key</label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              className="h-9 rounded-ds border border-border bg-surface px-3 font-mono text-sm uppercase outline-none focus:border-brand"
            />
          </div>

          <div className="flex flex-col gap-1 max-w-md">
            <label className="text-xs font-semibold text-text-subtle">Project Lead</label>
            <input
              type="text"
              disabled
              value={project.lead.name}
              className="h-9 rounded-ds border border-border-default bg-neutral px-3 text-sm text-subtle cursor-not-allowed"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button appearance="primary" type="submit" disabled={isSavingGeneral}>
              Save changes
            </Button>
            {generalSuccess && (
              <span className="flex items-center gap-1 text-xs font-semibold text-success">
                <CheckCircle2 size={14} /> Saved successfully!
              </span>
            )}
          </div>
        </form>
      )}

      {/* CUSTOM FIELDS TAB */}
      {activeTab === "custom_fields" && (
        <div className="flex flex-col gap-6">
          {/* Add Custom Field Form */}
          <form onSubmit={handleAddCustomField} className="flex flex-col gap-4 rounded-ds border border-brand/40 bg-selected/30 p-5 shadow-xs">
            <h3 className="font-semibold text-sm text-text flex items-center gap-1.5">
              <Plus size={16} className="text-brand" /> Add Custom Field
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-subtle">Field Name</label>
                <input
                  type="text"
                  placeholder="e.g. Environment, Customer ID"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  className="h-8 rounded-ds border border-border bg-surface px-2.5 text-xs outline-none focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-subtle">Field Type</label>
                <select
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value)}
                  className="h-8 rounded-ds border border-border bg-surface px-2 text-xs outline-none focus:border-brand"
                >
                  <option value="STRING">Text String</option>
                  <option value="NUMBER">Number</option>
                  <option value="DATE">Date</option>
                </select>
              </div>

              <div className="flex items-end mb-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                    className="rounded border-border text-brand"
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
          <div className="rounded-ds border border-border bg-surface overflow-hidden shadow-xs">
            <div className="p-3 border-b border-border bg-surface-sunken">
              <span className="text-xs font-bold text-text-subtle">
                Project Custom Fields ({customFields.length})
              </span>
            </div>

            {customFields.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-subtle italic">
                No custom fields defined for this project.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-text-subtle font-semibold">
                    <th className="p-3">Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Required</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customFields.map((field) => (
                    <tr key={field.id} className="hover:bg-neutral">
                      <td className="p-3 font-semibold text-text">{field.name}</td>
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
                          className="rounded p-1 text-danger hover:bg-danger/10 transition-colors"
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
    </div>
  );
}
