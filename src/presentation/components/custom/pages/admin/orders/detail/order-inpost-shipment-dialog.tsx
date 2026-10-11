import { type JSX, type SubmitEventHandler, useCallback } from "react"

import { Loader2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import {
  INPOST_PARCEL_DIMENSIONS_MM,
  INPOST_PARCEL_MAX_WEIGHT_KG,
  INPOST_PARCEL_TEMPLATES,
  type InpostParcelTemplate,
} from "~/src/integrations/inpost/inpost.constants"
import { inpostParcelTemplateSchema } from "~/src/integrations/inpost/inpost.zod"

import { type InpostDeliveryType } from "~/src/modules/order/order.constants"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/src/presentation/components/shadcn/dialog"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Label } from "~/src/presentation/components/shadcn/label"
import { NativeSelect, NativeSelectOption } from "~/src/presentation/components/shadcn/native-select"

const MILLIMETRES_PER_CENTIMETRE = 10

const WEIGHT_STEP_KG = 0.01

const centimetres = (millimetres: number): number => millimetres / MILLIMETRES_PER_CENTIMETRE

export const OrderInpostShipmentDialog = ({
  deliveryType,
  isPending,
  onConfirm,
  onOpenChange,
  open,
}: Readonly<OrderInpostShipmentDialogProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orderDetail.inpost.createDialog")
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!isPending) {
        onOpenChange(nextOpen)
      }
    },
    [isPending, onOpenChange],
  )
  const handleSubmit = useCallback<SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      onConfirm({
        parcelTemplate: inpostParcelTemplateSchema.parse(form.get("parcelTemplate")),
        weightKg: deliveryType === "courier" ? Number(form.get("weightKg")) : undefined,
      })
    },
    [deliveryType, onConfirm],
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{deliveryType === "courier" ? t("courierDescription") : t("lockerDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inpost-parcel-template">{t("sizeLabel")}</Label>
              <NativeSelect className="w-full" defaultValue="small" id="inpost-parcel-template" name="parcelTemplate">
                {INPOST_PARCEL_TEMPLATES.map((template) => (
                  <NativeSelectOption key={template} value={template}>
                    {t(`sizes.${template}`, {
                      height: centimetres(INPOST_PARCEL_DIMENSIONS_MM[template].height),
                      length: centimetres(INPOST_PARCEL_DIMENSIONS_MM[template].length),
                      width: centimetres(INPOST_PARCEL_DIMENSIONS_MM[template].width),
                    })}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            {deliveryType === "courier" && (
              <div className="space-y-2">
                <Label htmlFor="inpost-parcel-weight">{t("weightLabel")}</Label>
                <Input
                  id="inpost-parcel-weight"
                  inputMode="decimal"
                  max={INPOST_PARCEL_MAX_WEIGHT_KG}
                  min={WEIGHT_STEP_KG}
                  name="weightKg"
                  required
                  step={WEIGHT_STEP_KG}
                  type="number"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={() => {
                handleOpenChange(false)
              }}
              type="button"
              variant="outline"
            >
              {t("cancel")}
            </Button>
            <Button className="gap-1.5" disabled={isPending} type="submit">
              {isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
              {t("confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface OrderInpostShipmentDialogProps {
  readonly deliveryType: InpostDeliveryType
  readonly isPending: boolean
  readonly onConfirm: (parcel: { readonly parcelTemplate: InpostParcelTemplate; readonly weightKg: number | undefined }) => void
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
}
