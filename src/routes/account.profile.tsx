import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { getCustomerProfileQuery } from "~/src/modules/customer-account/use-cases/get-customer-profile"

import { Separator } from "~/src/presentation/components/shadcn/separator"

import { CloseAccountSection } from "~/src/presentation/components/custom/pages/account/profile/sections/close-account-section"
import { PersonalInfoSection } from "~/src/presentation/components/custom/pages/account/profile/sections/personal-info-section"
import { PreferencesSection } from "~/src/presentation/components/custom/pages/account/profile/sections/preferences-section"
import { SecuritySection } from "~/src/presentation/components/custom/pages/account/profile/sections/security-section"

const ProfilePage = (): JSX.Element => {
  const t = useTranslations("pages.account.profile")
  const { data: profile } = useSuspenseQuery(getCustomerProfileQuery())

  return (
    <div>
      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title")}</h1>
      </div>

      <PersonalInfoSection profile={profile} />
      <Separator className="my-10" />

      <PreferencesSection />
      <Separator className="my-10" />

      <SecuritySection />
      <Separator className="my-10" />

      <CloseAccountSection />
    </div>
  )
}

export const Route = createFileRoute("/account/profile")({
  component: ProfilePage,
  loader: ({ context }) =>
    context.queryClient.query({
      ...getCustomerProfileQuery(),
      staleTime: "static",
    }),
  staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
})
