import { type JSX } from "react"

import { CreditCard } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type Payment } from "~/src/modules/payment/payment.types"

import { SavedCardRow } from "~/src/presentation/components/custom/pages/account/payment/saved-card-row"

export const SavedCardList = ({ methods }: Readonly<SavedCardListProps>): JSX.Element => {
  const t = useTranslations("pages.account.payment")

  if (methods.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <CreditCard className="size-8 text-muted-foreground/30" strokeWidth={1} />
        <p className="max-w-md text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {methods.map((method) => (
        <SavedCardRow key={method.id} method={method} />
      ))}
    </ul>
  )
}

interface SavedCardListProps {
  readonly methods: readonly Payment["savedMethod"][]
}
