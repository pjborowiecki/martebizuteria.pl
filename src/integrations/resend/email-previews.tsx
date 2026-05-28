import type { ReactElement } from "react";

import { render } from "react-email";

import type { Locale } from "~/src/constants/types";

import { ChangeEmail } from "~/src/integrations/resend/templates/change-email";
import { OrderConfirmation } from "~/src/integrations/resend/templates/order-confirmation";
import { ResetPassword } from "~/src/integrations/resend/templates/reset-password";
import { VerifyEmail } from "~/src/integrations/resend/templates/verify-email";

/**
 * A previewable email: a human label and a factory that builds the template
 * element from its own `PreviewProps`, with the locale overridable so the same
 * sample can be inspected in every language.
 */
interface EmailPreview {
  readonly element: (locale: Locale) => ReactElement;
  readonly label: string;
}

/**
 * Registry of every transactional email, rendered with its built-in sample
 * props. Add a template here and it shows up in the `/dev/emails` previewer
 * automatically. Kept beside the templates (not in the route) so the route
 * stays a thin transport and the registry can be reused (tests, snapshots).
 */
export const EMAIL_PREVIEWS = {
  "change-email": {
    element: (locale) => <ChangeEmail {...ChangeEmail.PreviewProps} locale={locale} />,
    label: "Change email"
  },
  "order-confirmation": {
    element: (locale) => <OrderConfirmation {...OrderConfirmation.PreviewProps} locale={locale} />,
    label: "Order confirmation"
  },
  "reset-password": {
    element: (locale) => <ResetPassword {...ResetPassword.PreviewProps} locale={locale} />,
    label: "Reset password"
  },
  "verify-email": {
    element: (locale) => <VerifyEmail {...VerifyEmail.PreviewProps} locale={locale} />,
    label: "Verify email"
  }
} satisfies Record<string, EmailPreview>;

export type EmailPreviewSlug = keyof typeof EMAIL_PREVIEWS;

const SLUGS: string[] = Object.keys(EMAIL_PREVIEWS);

export function isEmailPreviewSlug(value: string): value is EmailPreviewSlug {
  return SLUGS.includes(value);
}

/** Renders a registered preview to HTML (or plain text) for the given locale. */
export function renderEmailPreview(slug: EmailPreviewSlug, locale: Locale, plainText: boolean): Promise<string> {
  return render(EMAIL_PREVIEWS[slug].element(locale), { plainText });
}
