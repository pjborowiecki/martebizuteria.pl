export interface AuditFieldChange<TValue> {
  readonly from: TValue
  readonly to: TValue
}

export interface AuditChangeMetadata<TBefore, TAfter> {
  readonly changed: readonly string[]
  readonly new: Partial<TAfter>
  readonly old: Partial<TBefore>
}

export const buildAuditChangeMetadata = <TBefore extends object, TAfter extends object>(
  before: TBefore,
  after: TAfter,
  fields: readonly (keyof TBefore & keyof TAfter)[],
): AuditChangeMetadata<TBefore, TAfter> | undefined => {
  const changed: string[] = []
  const oldValues: Partial<TBefore> = {}
  const newValues: Partial<TAfter> = {}

  for (const field of fields) {
    const previous = before[field]
    const next = after[field]

    if (!Object.is(previous, next)) {
      changed.push(String(field))
      oldValues[field] = previous
      newValues[field] = next
    }
  }

  if (changed.length === 0) {
    return undefined
  }

  return {
    changed,
    new: newValues,
    old: oldValues,
  }
}

const isPrintableAuditValue = (value: unknown): boolean => value === null || typeof value !== "object"

export const formatAuditDetailFromChanges = (
  labels: Readonly<Record<string, string>>,
  metadata: AuditChangeMetadata<object, object>,
): string =>
  metadata.changed
    .flatMap((field) => {
      const previous: unknown = Reflect.get(metadata.old, field)
      const next: unknown = Reflect.get(metadata.new, field)
      if (!isPrintableAuditValue(previous) || !isPrintableAuditValue(next)) {
        return []
      }

      return [`${labels[field] ?? field}: ${String(previous)} → ${String(next)}`]
    })
    .join("; ")

export const toAuditMetadataRecord = (metadata: AuditChangeMetadata<object, object>): Record<string, unknown> => ({
  changed: metadata.changed,
  new: metadata.new,
  old: metadata.old,
})
