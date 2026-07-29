"use client";

import { useTransition } from "react";
import { Paperclip, Loader2 } from "lucide-react";
import { uploadAttachmentAction, deleteAttachmentAction } from "@/app/(app)/projects/[key]/issues/actions";

interface IssueAttachmentsProps {
  issueId: string;
  attachments: any[];
  setAttachments: React.Dispatch<React.SetStateAction<any[]>>;
  isUploading: boolean;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  refreshDetail: () => Promise<void>;
  showToast: (msg: string) => void;
}

export function IssueAttachments({
  issueId,
  attachments,
  setAttachments,
  isUploading,
  setIsUploading,
  refreshDetail,
  showToast,
}: IssueAttachmentsProps) {
  const [, startTransition] = useTransition();

  const uploadFiles = (files: File[]) => {
    if (files.length === 0) return;
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    setIsUploading(true);
    startTransition(async () => {
      try {
        const res = await uploadAttachmentAction(issueId, formData);
        if (res?.error) {
          showToast(`Upload failed: ${res.error}`);
          return;
        }
        await refreshDetail();
        showToast(`Attached ${files.length} file${files.length > 1 ? "s" : ""}`);
      } finally {
        setIsUploading(false);
      }
    });
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadFiles(Array.from(files));
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    const previous = attachments;
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    startTransition(async () => {
      const res = await deleteAttachmentAction(attachmentId);
      if (res?.error) {
        setAttachments(previous);
        showToast(`Could not delete attachment: ${res.error}`);
        return;
      }
      await refreshDetail();
    });
  };

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={16} className="text-brand" />
          <h3 className="text-xs font-bold text-text uppercase tracking-wider">
            Attachments ({attachments.length})
          </h3>
          {isUploading && <Loader2 size={12} className="animate-spin text-text-subtle" />}
        </div>
        <label className="text-[11px] font-bold text-brand hover:underline cursor-pointer">
          + Upload
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {attachments.map((att) => (
          <div
            key={att.id}
            className="flex items-center justify-between p-2 rounded-lg bg-surface-sunken border border-border/50 text-xs group"
          >
            <div className="flex items-center gap-2 truncate">
              <Paperclip size={14} className="text-text-subtle shrink-0" />
              <span className="truncate font-medium text-text">{att.filename}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-brand hover:underline"
              >
                Download
              </a>
              <button
                onClick={() => handleDeleteAttachment(att.id)}
                className="text-danger/60 hover:text-danger text-xs px-1 font-bold"
                title="Remove attachment"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
