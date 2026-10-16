import { type JSX, useCallback, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"
import { listAdminDeliveryMethodsQuery } from "~/src/modules/delivery-method/use-cases/list-admin-delivery-methods"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DeliveryMethodDialog } from "~/src/presentation/components/custom/pages/admin/settings/delivery/delivery-method-dialog"
import { DeliveryMethodRow } from "~/src/presentation/components/custom/pages/admin/settings/delivery/delivery-method-row"
import { useDeliveryMethodActions } from "~/src/presentation/components/custom/pages/admin/settings/delivery/use-delivery-method-actions"
import { SettingsCard, SettingsRow } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"

const moveMethod = (methods: readonly DeliveryMethod["adminMethod"][], method: DeliveryMethod["adminMethod"], offset: -1 | 1): string[] => {
  const others = methods.filter((candidate) => candidate !== method)
  const target = methods.indexOf(method) + offset

  return [...others.slice(0, target), method, ...others.slice(target)].map((candidate) => candidate.id)
}

const ArchivedDeliveryMethods = ({ methods }: Readonly<{ methods: readonly DeliveryMethod["adminMethod"][] }>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery.methods")
  const locale = useLocale()
  const { archive } = useDeliveryMethodActions()

  const restore = useCallback(
    (method: DeliveryMethod["adminMethod"]) => {
      const name = resolveLocalizedString(method.names, locale)
      archive.mutate(
        { archived: false, id: method.id },
        {
          onSuccess: () => {
            toast.success(t("restored", { name }))
          },
        },
      )
    },
    [archive, locale, t],
  )

  return (
    <details className="group px-4 py-3 lg:px-5">
      <summary className="cursor-pointer text-[13px] font-medium text-foreground">{t("archived", { count: methods.length })}</summary>
      <p className="mt-1 text-[12px] text-muted-foreground">{t("archivedDescription")}</p>
      <div className="mt-2 divide-y divide-border/60">
        {methods.map((method) => (
          <SettingsRow
            action={
              <Button
                disabled={archive.isPending}
                onClick={() => {
                  restore(method)
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                {t("restore")}
              </Button>
            }
            key={method.id}
            label={resolveLocalizedString(method.names, locale)}
          >
            {t(`types.${method.type}`)} · {method.courier.name}
          </SettingsRow>
        ))}
      </div>
    </details>
  )
}

export const SettingsDeliveryMethodsCard = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery.methods")
  const { data } = useSuspenseQuery(listAdminDeliveryMethodsQuery())
  const { reorder } = useDeliveryMethodActions()
  const [editing, setEditing] = useState<{ readonly method: DeliveryMethod["adminMethod"] | undefined }>()
  const methods = data.methods.filter((method) => method.archivedAt === undefined)
  const archivedMethods = data.methods.filter((method) => method.archivedAt !== undefined)

  const move = useCallback(
    (method: DeliveryMethod["adminMethod"], offset: -1 | 1) => {
      reorder.mutate(moveMethod(methods, method, offset))
    },
    [methods, reorder],
  )

  return (
    <SettingsCard
      action={
        <Button
          className="shrink-0 gap-1.5 self-start"
          onClick={() => {
            setEditing({ method: undefined })
          }}
          size="sm"
          variant="outline"
        >
          <Plus aria-hidden />
          {t("add")}
        </Button>
      }
      description={t("description")}
      title={t("title")}
    >
      {methods.length === 0 ? <p className="px-4 py-4 text-[13px] text-muted-foreground lg:px-5">{t("empty")}</p> : undefined}
      {methods.map((method, index) => (
        <DeliveryMethodRow
          canMoveDown={index < methods.length - 1}
          canMoveUp={index > 0}
          isMoving={reorder.isPending}
          key={method.id}
          method={method}
          onEdit={() => {
            setEditing({ method })
          }}
          onMove={(offset) => {
            move(method, offset)
          }}
        />
      ))}
      {archivedMethods.length > 0 ? <ArchivedDeliveryMethods methods={archivedMethods} /> : undefined}
      {editing === undefined ? undefined : (
        <DeliveryMethodDialog
          couriers={data.couriers}
          key={editing.method?.id ?? "new"}
          method={editing.method}
          onClose={() => {
            setEditing(undefined)
          }}
        />
      )}
    </SettingsCard>
  )
}
