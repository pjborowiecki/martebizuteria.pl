import type { DragEvent, JSX } from "react";

import { ImageUp } from "lucide-react";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";

export interface UploadDropzoneProps {
  readonly disabled: boolean;
  readonly invalid: boolean;
  readonly isDragging: boolean;
  readonly onDragLeave: (event: DragEvent<HTMLElement>) => void;
  readonly onDragOver: (event: DragEvent<HTMLElement>) => void;
  readonly onDrop: (event: DragEvent<HTMLElement>) => void;
  readonly onPick: () => void;
}

/** Empty state of the single uploader: click-or-drop dropzone. */
export function UploadDropzone({
  disabled,
  invalid,
  isDragging,
  onDragLeave,
  onDragOver,
  onDrop,
  onPick
}: UploadDropzoneProps): JSX.Element {
  const t = useTranslations("pages.admin.media");

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={onPick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        disabled={disabled}
        className={cn(
          "h-auto w-full flex-col gap-2 rounded-md border border-dashed border-border bg-background px-6 py-9 text-center whitespace-normal shadow-none",
          "hover:border-foreground/50 hover:bg-muted/25",
          isDragging && "border-foreground bg-muted/30",
          invalid && "border-destructive"
        )}
      >
        <ImageUp aria-hidden className="size-6 text-muted-foreground" strokeWidth={1.5} />
        <span className="text-[13px] font-medium">{t("cta")}</span>
        <span className="text-[11px] text-muted-foreground/70">{t("hint")}</span>
      </Button>

      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-foreground/60 bg-background/80">
          <span className="text-[12px] font-medium">{t("dropHere")}</span>
        </div>
      )}
    </div>
  );
}
