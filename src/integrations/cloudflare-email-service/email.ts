import { env } from "cloudflare:workers";

import { CONSTANTS } from "~/src/constants";

import { tryCatch } from "~/src/lib/_utils/try-catch";

interface SendEmailProps {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
  readonly from?: EmailAddress;
}

type SendEmailResult =
  | { readonly messageId: string; readonly success: true }
  | { readonly error: string; readonly code: string; readonly success: false };

const DEFAULT_FROM: EmailAddress = {
  email: env.EMAIL_FROM ?? "noreply@martebizuteria.pl",
  name: CONSTANTS.APP_NAME
};

const { EMAIL } = env;

export async function sendEmail(props: SendEmailProps): Promise<SendEmailResult> {
  if (EMAIL === undefined) {
    return {
      code: "E_BINDING_MISSING",
      error: "Email binding 'EMAIL' is not available. Ensure 'send_email' is configured in wrangler.jsonc.",
      success: false
    };
  }

  const [result, caughtError] = await tryCatch(
    EMAIL.send({
      from: props.from ?? DEFAULT_FROM,
      html: props.html,
      subject: props.subject,
      text: props.text,
      to: props.to
    })
  );

  if (caughtError !== undefined) {
    const code =
      typeof caughtError === "object" && caughtError !== null && "code" in caughtError && typeof caughtError.code === "string"
        ? caughtError.code
        : "E_UNKNOWN";
    const message = caughtError instanceof Error ? caughtError.message : "An unknown error occurred while sending the email.";
    return { code, error: message, success: false };
  }

  if (result === undefined) {
    return { code: "E_UNKNOWN", error: "Email send returned no result.", success: false };
  }

  return { messageId: result.messageId, success: true };
}

export type { SendEmailProps, SendEmailResult };
