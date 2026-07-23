"use client";

import { useState } from "react";
import { Paperclip, FileText, Image as ImageIcon, Trash2, Download, Upload } from "lucide-react";
import { uploadAttachmentAction, deleteAttachmentAction } from "@/app/(app)/issues/actions";

export type AttachmentItem = {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date | string;
  uploader?: {
    id: string;
    name: string;
  };
};

export function AttachmentGallery({
  issueId,
  attachments: initialAttachments,
}: {
  issueId: string;
  attachments: AttachmentItem[];
}) {
  const [attachments, setAttachments] = useState<AttachmentItem[]>(initialAttachments);
  const [isUploading, setIsUploading] = useState(false);

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || isUploading) return;
    setIsUploading(true);
    try {
      // Create object URL or fallback mock URL for client upload
      const mockUrl = URL.createObjectURL(file);
      const created = await uploadAttachmentAction({
        issueId,
        filename: file.name,
        url: mockUrl,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      const newAtt: AttachmentItem = {
        id: created.id,
        filename: created.filename,
        url: created.url,
        mimeType: created.mimeType,
        sizeBytes: created.sizeBytes,
        createdAt: created.createdAt,
      };
      setAttachments((prev) => [newAtt, ...prev]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(attachmentId: string) {
    try {
      await deleteAttachmentAction(attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="mt-6 rounded-md border border-border-default bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-default flex items-center gap-2">
          <Paperclip size={16} className="text-subtle" />
          Attachments
          <span className="rounded-full bg-neutral px-2 py-0.5 text-xs text-subtle font-normal">
            {attachments.length}
          </span>
        </h4>
        <label className="flex cursor-pointer items-center gap-1 rounded-ds bg-neutral px-2.5 py-1 text-xs font-medium text-default hover:bg-neutral-hovered">
          <Upload size={13} />
          Upload
          <input
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
        </label>
      </div>

      {attachments.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {attachments.map((att) => {
            const isImage = att.mimeType.startsWith("image/");
            return (
              <div
                key={att.id}
                className="group relative flex flex-col justify-between rounded-md border border-border-default bg-surface-raised p-2.5 transition-all hover:border-brand"
              >
                <div className="flex items-start gap-2 mb-2">
                  {isImage ? (
                    <ImageIcon size={18} className="text-brand shrink-0 mt-0.5" />
                  ) : (
                    <FileText size={18} className="text-subtle shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-default" title={att.filename}>
                      {att.filename}
                    </p>
                    <span className="text-[10px] text-subtlest">{formatBytes(att.sizeBytes)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border-default/50 pt-2 text-[11px]">
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-medium text-brand hover:underline"
                  >
                    <Download size={12} /> View
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(att.id)}
                    className="text-subtlest hover:text-danger p-0.5"
                    title="Delete attachment"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-subtles italic">No attachments added.</p>
      )}
    </div>
  );
}
