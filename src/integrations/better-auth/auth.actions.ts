import { createElement } from "react";

import { env } from "cloudflare:workers";

import { CONSTANTS } from "~/src/constants";

import { AccountDeleted } from "~/src/integrations/resend/templates/account-deleted";
import { ChangeEmail } from "~/src/integrations/resend/templates/change-email";
import { ResetPassword } from "~/src/integrations/resend/templates/reset-password";
import { VerifyEmail } from "~/src/integrations/resend/templates/verify-email";
import { getMessagesForLocale } from "~/src/integrations/use-intl/i18n.queries";

import { sendEmail } from "~/src/lib/_utils/email";
import { getCurrentLocale } from "~/src/lib/_utils/locale";
import { buildLocalizedUrl } from "~/src/lib/utils";

interface AuthEmailParams {
  readonly url: string;
  readonly user: { readonly email: string; readonly name: string };
}

interface AccountDeletedEmailParams {
  readonly email: string;
  readonly locale?: ReturnType<typeof getCurrentLocale>;
  readonly name: string;
}

function resolveEmailVerificationCallbackUrl(url: string, locale: ReturnType<typeof getCurrentLocale>): string {
  try {
    const parsed = new URL(url);
    const callbackParam = parsed.searchParams.get("callbackURL");
    if (callbackParam === null) {
      return url;
    }

    const callback = decodeURIComponent(callbackParam);
    const storefrontHome = buildLocalizedUrl("", "/", locale);
    const redirectsToStorefront = callback === "/" || callback === storefrontHome || callback.startsWith(`${storefrontHome}?`);

    if (!redirectsToStorefront) {
      return url;
    }

    const accountCallback = buildLocalizedUrl("", `${CONSTANTS.ROUTES.ACCOUNT_OVERVIEW}?verified=true`, locale);
    parsed.searchParams.set("callbackURL", accountCallback);
    return parsed.toString();
  } catch {
    return url;
  }
}

const sendVerificationEmail = async ({ user, url }: AuthEmailParams): Promise<void> => {
  const locale = getCurrentLocale();
  const verificationUrl = resolveEmailVerificationCallbackUrl(url, locale);

  const [, error] = await sendEmail({
    react: createElement(VerifyEmail, { locale, name: user.name, verificationUrl }),
    subject: getMessagesForLocale(locale).pages.auth.email.verifyEmail.subject,
    to: user.email
  });

  if (error !== undefined) {
    console.error("[Auth] Failed to send verification email", error);
  }
};

const sendResetPassword = async ({ user, url }: AuthEmailParams): Promise<void> => {
  const locale = getCurrentLocale();

  const [, error] = await sendEmail({
    react: createElement(ResetPassword, { locale, name: user.name, resetPasswordUrl: url }),
    subject: getMessagesForLocale(locale).pages.auth.email.resetPassword.subject,
    to: user.email
  });

  if (error !== undefined) {
    console.error("[Auth] Failed to send reset-password email", error);
  }
};

const sendChangeEmailConfirmation = async ({ user, url }: AuthEmailParams): Promise<void> => {
  const locale = getCurrentLocale();

  const [, error] = await sendEmail({
    react: createElement(ChangeEmail, { locale, name: user.name, verificationUrl: url }),
    subject: getMessagesForLocale(locale).pages.auth.email.changeEmail.subject,
    to: user.email
  });

  if (error !== undefined) {
    console.error("[Auth] Failed to send change-email confirmation", error);
  }
};

const sendAccountDeletedEmail = async ({ email, locale, name }: AccountDeletedEmailParams): Promise<void> => {
  const resolvedLocale = locale ?? getCurrentLocale();
  const storefrontUrl = `${env.VITE_APP_URL}/${resolvedLocale}`;

  const [, error] = await sendEmail({
    react: createElement(AccountDeleted, { locale: resolvedLocale, name, storefrontUrl }),
    subject: getMessagesForLocale(resolvedLocale).pages.auth.email.accountDeleted.subject,
    to: email
  });

  if (error !== undefined) {
    console.error("[Auth] Failed to send account-deleted email", error);
  }
};

export const authActions = {
  sendAccountDeletedEmail,
  sendChangeEmailConfirmation,
  sendResetPassword,
  sendVerificationEmail
};
