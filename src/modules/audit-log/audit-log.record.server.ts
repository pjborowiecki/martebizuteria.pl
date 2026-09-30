import { env } from "cloudflare:workers"

import { getRequestHeaders } from "@tanstack/react-start/server"
import { v7 as uuidv7 } from "uuid"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import {
  type AuditLogAction,
  type AuditLogActorRole,
  type AuditLogCategory,
  type AuditLogSeverity,
} from "~/src/modules/audit-log/audit-log.constants"
import { type AuditLogQueueMessage } from "~/src/modules/audit-log/audit-log.queue.server"
import { serializeAuditMetadata } from "~/src/modules/audit-log/audit-log.utils"

import { scheduleBackgroundWork } from "~/src/lib/background"
import { resolveRequestIp } from "~/src/lib/request"

export interface AuditLogActorInput {
  readonly email?: string | undefined
  readonly id?: string | undefined
  readonly name: string
  readonly role: AuditLogActorRole
}

export interface AuditLogEventInput {
  readonly action: AuditLogAction
  readonly actor: AuditLogActorInput
  readonly category: AuditLogCategory
  readonly detail?: string | undefined
  readonly ip?: string | undefined
  readonly metadata?: Record<string, unknown> | undefined
  readonly resourceId?: string | undefined
  readonly severity: AuditLogSeverity
  readonly target: string
}

export const SYSTEM_AUDIT_ACTOR: AuditLogActorInput = {
  name: "System",
  role: "system",
}

export const resolveRequestAuditActor = async (): Promise<AuditLogActorInput | undefined> => {
  const session = await getRequestSession()
  const user = session?.user

  if (user === undefined) {
    return undefined
  }

  let role: AuditLogActorRole = "unknown"
  if (user.role === ROLES.ADMIN) {
    role = "admin"
  } else if (user.role === ROLES.CUSTOMER) {
    role = "customer"
  }

  return {
    email: user.email,
    id: user.id,
    name: user.name,
    role,
  }
}

export const resolveRequestAuditIp = (): string | undefined => resolveRequestIp(getRequestHeaders())

const buildQueueMessage = (input: AuditLogEventInput): AuditLogQueueMessage => ({
  action: input.action,
  actorId: input.actor.id,
  actorName: input.actor.name,
  actorRole: input.actor.role,
  category: input.category,
  createdAt: Date.now(),
  detail: input.detail,
  id: uuidv7(),
  ip: input.ip,
  metadata: serializeAuditMetadata(input.metadata),
  resourceId: input.resourceId,
  severity: input.severity,
  target: input.target,
})

const enqueueAuditLogMessage = async (message: AuditLogQueueMessage): Promise<void> => {
  await env.AUDIT_LOG_QUEUE.send(message, { contentType: "json" })
}

export const scheduleAuditLog = (input: AuditLogEventInput): void => {
  scheduleBackgroundWork(enqueueAuditLogMessage(buildQueueMessage(input)))
}

export const scheduleAuditLogFromRequest = (
  input: Omit<AuditLogEventInput, "actor"> & { readonly actor?: AuditLogActorInput | undefined },
): void => {
  scheduleBackgroundWork(
    (async () => {
      const actor = input.actor ?? (await resolveRequestAuditActor()) ?? SYSTEM_AUDIT_ACTOR
      const ip = input.ip ?? resolveRequestAuditIp()
      await enqueueAuditLogMessage(
        buildQueueMessage({
          action: input.action,
          actor,
          category: input.category,
          detail: input.detail,
          ip,
          metadata: input.metadata,
          resourceId: input.resourceId,
          severity: input.severity,
          target: input.target,
        }),
      )
    })(),
  )
}

export const scheduleSystemAuditLog = (input: Omit<AuditLogEventInput, "actor">): void => {
  scheduleAuditLog({
    ...input,
    actor: SYSTEM_AUDIT_ACTOR,
  })
}
