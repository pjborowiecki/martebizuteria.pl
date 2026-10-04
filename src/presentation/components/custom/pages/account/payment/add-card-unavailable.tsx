import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

export const AddCardUnavailable = ({ onCancel }: Readonly<{ onCancel: () => void }>): JSX.Element => {
  const t = useTranslations("pages.account.payment")

  return (
    <div className="border-b border-border py-6">
      <p className="text-sm text-destructive" role="alert">
        {t("formUnavailable")}
      </p>
      <Button className="mt-6" onClick={onCancel} type="button" variant="account-ghost">
        {t("cancel")}
      </Button>
    </div>
  )
}
