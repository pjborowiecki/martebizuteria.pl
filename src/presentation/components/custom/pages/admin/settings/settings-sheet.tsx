import { type JSX, type ReactNode, type SubmitEventHandler } from "react"

import { Loader2 } from "lucide-react"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "~/src/presentation/components/shadcn/sheet"

import { CatalogFormSheetContent } from "~/src/presentation/components/custom/pages/admin/catalog/catalog-form-sheet-content"

export const SettingsSheet = ({
  children,
  description,
  footer,
  formId,
  isPending,
  onClose,
  onSubmit,
  title,
}: Readonly<SettingsSheetProps>): JSX.Element => (
  <Sheet
    onOpenChange={(open) => {
      if (!open && !isPending) {
        onClose()
      }
    }}
    open
  >
    <CatalogFormSheetContent>
      <SheetHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 pr-14">
        <SheetTitle className="text-base font-semibold tracking-tight">{title}</SheetTitle>
        <SheetDescription className="max-w-md text-[13px] leading-relaxed text-muted-foreground">{description}</SheetDescription>
      </SheetHeader>
      <form className="min-h-0 flex-1 overflow-y-auto" id={formId} noValidate onSubmit={onSubmit}>
        <div className="space-y-10 px-6 py-6">{children}</div>
      </form>
      <div className="shrink-0 border-t border-border bg-background px-6 py-4">
        <div className="flex flex-row justify-end gap-3">{footer}</div>
      </div>
    </CatalogFormSheetContent>
  </Sheet>
)

export const SettingsSheetCancelButton = ({ disabled, label, onClick }: Readonly<SettingsSheetCancelButtonProps>): JSX.Element => (
  <Button className="min-w-[88px]" disabled={disabled} onClick={onClick} type="button" variant="outline">
    {label}
  </Button>
)

export const SettingsSheetSubmitButton = ({ formId, isPending, label }: Readonly<SettingsSheetSubmitButtonProps>): JSX.Element => (
  <Button className="min-w-[140px] gap-2" disabled={isPending} form={formId} type="submit">
    {isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
    {label}
  </Button>
)

interface SettingsSheetProps {
  readonly children: ReactNode
  readonly description: string
  readonly footer: ReactNode
  readonly formId: string
  readonly isPending: boolean
  readonly onClose: () => void
  readonly onSubmit: SubmitEventHandler<HTMLFormElement>
  readonly title: string
}

interface SettingsSheetCancelButtonProps {
  readonly disabled: boolean
  readonly label: string
  readonly onClick: () => void
}

interface SettingsSheetSubmitButtonProps {
  readonly formId: string
  readonly isPending: boolean
  readonly label: string
}
