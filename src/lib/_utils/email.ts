import { tryCatch } from "~/src/lib/_utils/try-catch";

import type { RequireAtLeastOne } from "~/src/types/utils";

export type SendEmailProps = Readonly<{ to: string; subject: string } & RequireAtLeastOne<{ html: string; text: string }>>;

export type SendEmailResult =
  | { readonly status: number; readonly success: true }
  | { readonly error: string; readonly status: number; readonly success: false };

function isBlank(value: string | undefined): boolean {
  return (value ?? "").trim() === "";
}

function parseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return JSON.stringify(error);
}

function validateProps(props: SendEmailProps): SendEmailResult | undefined {
  if (isBlank(props.to)) {
    return { error: "Recipient address cannot be empty.", status: 400, success: false };
  }
  if (isBlank(props.subject)) {
    return { error: "Email subject cannot be empty.", status: 400, success: false };
  }
  return undefined;
}

export async function sendEmail(props: SendEmailProps): Promise<SendEmailResult> {
  const validationError = validateProps(props);
  if (validationError !== undefined) {
    return validationError;
  }

  const mailPromise = Promise.resolve({ status: 200 });
  const [data, caughtError] = await tryCatch(mailPromise);

  if (caughtError !== undefined) {
    return {
      error: parseErrorMessage(caughtError),
      status: 500,
      success: false
    };
  }

  if (data === undefined) {
    return {
      error: "Internal Error: Mailer returned no data.",
      status: 500,
      success: false
    };
  }

  return { status: data.status, success: true };
}
