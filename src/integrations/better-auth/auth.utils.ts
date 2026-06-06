import { CONSTANTS } from "~/src/constants";

import { auth } from "~/src/integrations/better-auth/auth._server";

import { recordAuthLoginFailedAudit } from "~/src/modules/audit-log/audit-log.events.server";

const AUTH_API_PREFIX = "/api/auth";

function resolveAuthPathname(request: Request): string {
  const { pathname } = new URL(request.url);
  return pathname.startsWith(AUTH_API_PREFIX) ? pathname.slice(AUTH_API_PREFIX.length) : pathname;
}

function isEmailSignInAttempt(authPath: string, method: string): boolean {
  return method === "POST" && authPath === CONSTANTS.ROUTES.API_AUTH.SIGN_IN_EMAIL;
}

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

async function parseSignInEmail(request: Request): Promise<string | undefined> {
  try {
    const body: unknown = await request.clone().json();
    if (typeof body !== "object" || body === null || !("email" in body)) {
      return undefined;
    }

    const { email } = body;
    return typeof email === "string" && email !== "" ? email : undefined;
  } catch {
    return undefined;
  }
}

export async function handleAuthRequestWithAudit(request: Request): Promise<Response> {
  const authPath = resolveAuthPathname(request);
  const shouldAuditFailedLogin = isEmailSignInAttempt(authPath, request.method);
  const signInEmail = shouldAuditFailedLogin ? await parseSignInEmail(request) : undefined;
  const ip = shouldAuditFailedLogin ? resolveRequestIp(request.headers) : undefined;

  const response = await auth.handler(request);

  if (shouldAuditFailedLogin && !response.ok && signInEmail !== undefined) {
    recordAuthLoginFailedAudit(signInEmail, {
      detail: signInEmail,
      ip,
      metadata: { email: signInEmail }
    });
  }

  return response;
}
