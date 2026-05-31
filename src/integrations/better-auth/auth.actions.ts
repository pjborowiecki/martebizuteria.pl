import { createElement } from "react";

import { ChangeEmail } from "~/src/integrations/resend/templates/change-email";
import { ResetPassword } from "~/src/integrations/resend/templates/reset-password";
import { VerifyEmail } from "~/src/integrations/resend/templates/verify-email";
import { getMessagesForLocale } from "~/src/integrations/use-intl/i18n.queries";

import { sendEmail } from "~/src/lib/_utils/email";
import { getCurrentLocale } from "~/src/lib/_utils/locale";

interface AuthEmailParams {
  readonly url: string;
  readonly user: { readonly email: string; readonly name: string };
}

const sendVerificationEmail = async ({ user, url }: AuthEmailParams): Promise<void> => {
  const locale = getCurrentLocale();

  const [, error] = await sendEmail({
    react: createElement(VerifyEmail, { locale, name: user.name, verificationUrl: url }),
    subject: getMessagesForLocale(locale).auth.email.verifyEmail.subject,
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
    subject: getMessagesForLocale(locale).auth.email.resetPassword.subject,
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
    subject: getMessagesForLocale(locale).auth.email.changeEmail.subject,
    to: user.email
  });

  if (error !== undefined) {
    console.error("[Auth] Failed to send change-email confirmation", error);
  }
};

export const authActions = {
  sendChangeEmailConfirmation,
  sendResetPassword,
  sendVerificationEmail
};
