import { z } from "zod/v4";

const EMPTY_LENGTH = 0;

export const adminUserMetadataSchema = z.object({
  notes: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export type AdminUserMetadata = z.infer<typeof adminUserMetadataSchema>;

function isStructuredMetadata(value: unknown): value is AdminUserMetadata {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return "notes" in value || "tags" in value;
}

function normalizeTags(tags: readonly string[] | undefined): string[] | undefined {
  if (tags === undefined) {
    return undefined;
  }

  const normalized = tags.map((tag) => tag.trim()).filter((tag) => tag.length > EMPTY_LENGTH);
  return normalized.length === EMPTY_LENGTH ? undefined : normalized;
}

export function parseAdminUserMetadata(raw: string | null | undefined): AdminUserMetadata {
  const trimmed = raw?.trim();
  if (trimmed === undefined || trimmed === "") {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (isStructuredMetadata(parsed)) {
      const result = adminUserMetadataSchema.safeParse(parsed);
      if (result.success) {
        return {
          notes: result.data.notes?.trim() === "" ? undefined : result.data.notes?.trim(),
          tags: normalizeTags(result.data.tags)
        };
      }
    }
  } catch {
    // Legacy plain-text notes stored before structured metadata.
  }

  return { notes: trimmed };
}

export function serializeAdminUserMetadata(metadata: AdminUserMetadata): string | undefined {
  const notes = metadata.notes?.trim();
  const tags = normalizeTags(metadata.tags);
  const hasNotes = notes !== undefined && notes !== "";
  const hasTags = tags !== undefined;

  if (!hasNotes && !hasTags) {
    return undefined;
  }

  return JSON.stringify({
    notes: hasNotes ? notes : undefined,
    tags: hasTags ? tags : undefined
  });
}
