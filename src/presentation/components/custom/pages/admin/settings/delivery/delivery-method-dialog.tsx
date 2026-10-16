import { type JSX, type SubmitEventHandler, useCallback, useState } from "react"

import { Archive, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "~/src/presentation/components/shadcn/alert-dialog"
import { Button } from "~/src/presentation/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/src/presentation/components/shadcn/dialog"

import { DeliveryMethodFields } from "~/src/presentation/components/custom/pages/admin/settings/delivery/delivery-method-fields"
import {
  type DeliveryMethodFieldErrors,
  type DeliveryMethodFormState,
  toCreateDeliveryMethodInput,
  toDeliveryMethodFormState,
  toUpdateDeliveryMethodInput,
} from "~/src/presentation/components/custom/pages/admin/settings/delivery/delivery-method-form.utils"
import { useDeliveryMethodActions } from "~/src/presentation/components/custom/pages/admin/settings/delivery/use-delivery-method-actions"

const ArchiveMethodButton = ({ disabled, method, name, onArchived }: Readonly<ArchiveMethodButtonProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery")
  const { archive } = useDeliveryMethodActions()
  const [confirming, setConfirming] = useState(false)

  const confirm = useCallback(() => {
    archive.mutate(
      { archived: true, id: method.id },
      {
        onSuccess: () => {
          toast.success(t("methods.archivedToast", { name }))
          onArchived()
        },
      },
    )
  }, [archive, method.id, name, onArchived, t])

  return (
    <>
      <Button
        className="sm:mr-auto"
        disabled={disabled}
        onClick={() => {
          setConfirming(true)
        }}
        type="button"
        variant="outline"
      >
        {t("form.archive")}
      </Button>
      <AlertDialog
        onOpenChange={() => {
          if (!archive.isPending) {
            setConfirming(false)
          }
        }}
        open={confirming}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia tone="destructive">
              <Archive />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("archiveDialog.title", { name })}</AlertDialogTitle>
            <AlertDialogDescription>{t("archiveDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archive.isPending}>{t("archiveDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="gap-1.5" disabled={archive.isPending} onClick={confirm} type="button" variant="destructive">
              {archive.isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
              {t("archiveDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export const DeliveryMethodDialog = ({ couriers, method, onClose }: Readonly<DeliveryMethodDialogProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery")
  const locale = useLocale()
  const { create, update } = useDeliveryMethodActions()
  const [state, setState] = useState(() => toDeliveryMethodFormState(method, couriers))
  const [errors, setErrors] = useState<DeliveryMethodFieldErrors>({})
  const isPending = create.isPending || update.isPending
  const name = method === undefined ? "" : resolveLocalizedString(method.names, locale)

  const handleChange = useCallback((patch: Partial<DeliveryMethodFormState>) => {
    setState((current) => ({ ...current, ...patch }))
  }, [])

  const handleSubmit = useCallback<SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()
      const saved = {
        onSuccess: () => {
          toast.success(t(method === undefined ? "methods.created" : "methods.saved"))
          onClose()
        },
      }
      const submission = method === undefined ? toCreateDeliveryMethodInput(state, couriers) : toUpdateDeliveryMethodInput(state, method)
      setErrors("errors" in submission ? submission.errors : {})
      if ("errors" in submission) {
        return
      }

      if ("type" in submission.input) {
        create.mutate(submission.input, saved)
      } else {
        update.mutate(submission.input, saved)
      }
    },
    [couriers, create, method, onClose, state, t, update],
  )

  return (
    <Dialog
      onOpenChange={() => {
        if (!isPending) {
          onClose()
        }
      }}
      open
    >
      <DialogContent>
        <form noValidate onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{method === undefined ? t("form.addTitle") : t("form.editTitle", { name })}</DialogTitle>
            <DialogDescription>
              {method === undefined ? t("form.description") : `${t(`methods.types.${method.type}`)} · ${method.courier.name}`}
            </DialogDescription>
          </DialogHeader>
          <DeliveryMethodFields couriers={couriers} errors={errors} isNew={method === undefined} onChange={handleChange} state={state} />
          <DialogFooter>
            {method !== undefined && <ArchiveMethodButton disabled={isPending} method={method} name={name} onArchived={onClose} />}
            <Button disabled={isPending} onClick={onClose} type="button" variant="outline">
              {t("form.cancel")}
            </Button>
            <Button className="gap-1.5" disabled={isPending} type="submit">
              {isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
              {method === undefined ? t("form.create") : t("form.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface ArchiveMethodButtonProps {
  readonly disabled: boolean
  readonly method: DeliveryMethod["adminMethod"]
  readonly name: string
  readonly onArchived: () => void
}

interface DeliveryMethodDialogProps {
  readonly couriers: DeliveryMethod["adminList"]["couriers"]
  readonly method: DeliveryMethod["adminMethod"] | undefined
  readonly onClose: () => void
}
