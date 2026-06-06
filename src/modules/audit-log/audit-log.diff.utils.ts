const EMPTY_CHANGED_FIELDS = 0;

export interface AuditFieldChange<TValue> {
  readonly from: TValue;
  readonly to: TValue;
}

export interface AuditChangeMetadata<TBefore, TAfter> {
  readonly changed: readonly string[];
  readonly new: Partial<TAfter>;
  readonly old: Partial<TBefore>;
}

export function buildAuditChangeMetadata<TBefore extends object, TAfter extends object>(
  before: TBefore,
  after: TAfter,
  fields: readonly (keyof TBefore & keyof TAfter)[]
): AuditChangeMetadata<TBefore, TAfter> | undefined {
  const changed: string[] = [];
  const oldValues: Partial<TBefore> = {};
  const newValues: Partial<TAfter> = {};

  for (const field of fields) {
    const previous = before[field];
    const next = after[field];

    if (!Object.is(previous, next)) {
      changed.push(String(field));
      oldValues[field] = previous;
      newValues[field] = next;
    }
  }

  if (changed.length === EMPTY_CHANGED_FIELDS) {
    return undefined;
  }

  return {
    changed,
    new: newValues,
    old: oldValues
  };
}

export function formatAuditDetailFromChanges(
  labels: Readonly<Record<string, string>>,
  metadata: AuditChangeMetadata<object, object>
): string {
  return metadata.changed
    .map((field) => {
      const label = labels[field] ?? field;
      const previous: unknown = Reflect.get(metadata.old, field);
      const next: unknown = Reflect.get(metadata.new, field);
      return `${label}: ${String(previous)} → ${String(next)}`;
    })
    .join("; ");
}

export function toAuditMetadataRecord(metadata: AuditChangeMetadata<object, object>): Record<string, unknown> {
  return {
    changed: metadata.changed,
    new: metadata.new,
    old: metadata.old
  };
}
