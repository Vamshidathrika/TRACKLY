"use server";

/**
 * Image upload for the rich text editor (paste, drop, and the toolbar's
 * "insert image" button).
 *
 * Deliberately a separate action from `uploadAttachmentAction` in
 * `app/(app)/projects/[key]/issues/actions.ts` — that file is owned by
 * another agent right now and is off-limits for this task (see
 * .plan/editor-deps.md). This stores to the same `@vercel/blob` bucket, under
 * a distinct `editor-images/` prefix, and deliberately does NOT create an
 * Attachment row: an inline image is part of the document body, not a file
 * attached to the issue. (If a future change wants inline images to also
 * show up in the Attachments list, that is a one-line addition to
 * `uploadAttachmentAction` once this file and that one are owned together.)
 *
 * Access control mirrors `uploadAttachmentAction` exactly: resolve the
 * issue's project, then require membership via `checkProjectAccess` before
 * touching blob storage. The returned URL is later re-validated by
 * `sanitizeNodeAttrs("image", …)` (schema.ts) at save time and by
 * RichRenderer at render time — this action controls what a well-behaved
 * client can upload, not what can end up rendered.
 */

import { put } from "@vercel/blob";
import { getAuthUser } from "@/lib/auth";
import { checkProjectAccess } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB — inline images stay smaller than general attachments (10 MB there).
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
]);

export type UploadImageResult = { url: string } | { error: string };

export async function uploadEditorImageAction(
  issueId: string,
  formData: FormData
): Promise<UploadImageResult> {
  try {
    const user = await getAuthUser();

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { projectId: true },
    });
    if (!issue) {
      return { error: "This ticket is not saved yet, so images cannot be uploaded." };
    }
    if (!(await checkProjectAccess(user.id, issue.projectId))) {
      return { error: "You do not have access to this issue" };
    }

    const file = formData.get("file");
    if (!(file instanceof File)) return { error: "No file provided" };
    if (file.size === 0) return { error: "That file is empty" };
    if (file.size > MAX_IMAGE_BYTES) {
      return { error: `${file.name} is larger than the 5 MB limit` };
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return { error: "Only PNG, JPEG, GIF, WebP or AVIF images are supported" };
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return { error: "Image storage is not configured. Set BLOB_READ_WRITE_TOKEN." };
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "image";
    const blob = await put(`editor-images/${issueId}/${safeName}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });

    return { url: blob.url };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    return { error: "Upload failed" };
  }
}
