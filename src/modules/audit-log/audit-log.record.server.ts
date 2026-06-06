import { getRequestHeaders } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { v7 as uuidv7 } from "uuid";

import { ROLES } from "~/src/constants/_constants/permissions";

import { auth } from "~/src/integrations/better-auth/auth._server";
import { scheduleBackgroundWork } from "~/src/integrations/better-auth/auth.background";

import type { AuditLogAction, AuditLogActorRole, AuditLogCategory, AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants";
import type { AuditLogQueueMessage } from "~/src/modules/audit-log/audit-log.queue.server";
import { serializeAuditMetadata } from "~/src/modules/audit-log/audit-log.utils";
import { resolveAdminCustomerInitials } from "~/src/modules/user/user.utils";

export interface AuditLogActorInput {
  readonly id?: string;
  readonly name: string;
  readonly role: AuditLogActorRole;
}

export interface AuditLogEventInput {
  readonly action: AuditLogAction;
  readonly actor: AuditLogActorInput;
  readonly category: AuditLogCategory;
  readonly detail?: string;
  readonly ip?: string;
  readonly metadata?: Record<string, unknown>;
  readonly resourceId?: string;
  readonly severity: AuditLogSeverity;
  readonly target: string;
}

export const SYSTEM_AUDIT_ACTOR: AuditLogActorInput = {
  name: "System",
  role: "system"
};

function resolveRequestIp(headers: Headers): string | undefined {
  const connectingIp = headers.get("cf-connecting-ip");
  if (connectingIp !== null && connectingIp !== "") {
    return connectingIp;
  }

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded === null || forwarded === "") {
    return undefined;
  }

  const [first] = forwarded.split(",");
  const trimmed = first?.trim();
  return trimmed === "" ? undefined : trimmed;
}

export async function resolveRequestAuditActor(): Promise<AuditLogActorInput | undefined> {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  const user = session?.user;

  if (user === undefined) {
    return undefined;
  }

  let role: AuditLogActorRole = "unknown";
  if (user.role === ROLES.ADMIN) {
    role = "admin";
  } else if (user.role === ROLES.CUSTOMER) {
    role = "customer";
  }

  return {
    id: user.id,
    name: user.name,
    role
  };
}

export function resolveRequestAuditIp(): string | undefined {
  return resolveRequestIp(getRequestHeaders());
}

function buildQueueMessage(input: AuditLogEventInput): AuditLogQueueMessage {
  return {
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
    target: input.target
  };
}

async function enqueueAuditLogMessage(message: AuditLogQueueMessage): Promise<void> {
  await env.AUDIT_LOG_QUEUE.send(message, { contentType: "json" });
}

/** Non-blocking audit enqueue via Cloudflare Queues (`waitUntil` when available). */
export function scheduleAuditLog(input: AuditLogEventInput): void {
  scheduleBackgroundWork(enqueueAuditLogMessage(buildQueueMessage(input)));
}

export function scheduleAuditLogFromRequest(
  input: Omit<AuditLogEventInput, "actor"> & { readonly actor?: AuditLogActorInput; readonly ip?: string }
): void {
  scheduleBackgroundWork(
    (async () => {
      const actor = input.actor ?? (await resolveRequestAuditActor()) ?? SYSTEM_AUDIT_ACTOR;
      const ip = input.ip ?? resolveRequestAuditIp();
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
          target: input.target
        })
      );
    })()
  );
}

export function scheduleSystemAuditLog(input: Omit<AuditLogEventInput, "actor">): void {
  scheduleAuditLog({
    ...input,
    actor: SYSTEM_AUDIT_ACTOR
  });
}

export function resolveActorInitials(name: string): string {
  return resolveAdminCustomerInitials(name);
}
