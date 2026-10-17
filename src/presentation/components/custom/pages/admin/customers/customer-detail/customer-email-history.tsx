import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { type User } from "~/src/modules/user/user.types"

export const CustomerEmailHistory = ({ emailHistory }: Readonly<Pick<User["adminCustomerDetail"], "emailHistory">>): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail.emails")

  return (
    <section>
      <h3 className="mb-2 text-[12px] font-medium tracking-wider text-muted-foreground/50 uppercase">{t("title")}</h3>
      <ul className="space-y-2" data-slot="customer-email-history">
        {emailHistory.map(({ addedOn, email, replacedOn }) => (
          <li key={`${email}-${addedOn}`} className="min-w-0 text-[13px]">
            <p className="truncate text-foreground" title={email}>
              {email}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {replacedOn === undefined ? t("current", { since: addedOn }) : t("former", { from: addedOn, until: replacedOn })}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
