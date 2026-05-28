import type { ReactElement } from "react";

import { env } from "cloudflare:workers";

import { CONSTANTS } from "~/src/constants";

import { resend } from "~/src/integrations/resend/resend.config";

import { tryCatch } from "~/src/lib/_utils/try-catch";

interface SendEmailOptions {
  readonly from?: string;
  readonly react: ReactElement;
  readonly subject: string;
  readonly to: string;
}

export function sendEmail({ from, react, subject, to }: Readonly<SendEmailOptions>) {
  return tryCatch(
    resend.emails.send({
      from: from ?? `${CONSTANTS.APP_NAME} <${env.RESEND_EMAIL_FROM}>`,
      react,
      subject,
      to
    })
  );
}
