import { type ChangeEvent, type DragEvent, type JSX, useCallback, useRef, useState } from "react";

import { ImagePlus } from "lucide-react";
import { useTranslations } from "use-intl";

import { ACCEPTED_IMAGE_ACCEPT_ATTR } from "~/src/integrations/cloudflare-r2/media.zod";

import { cn } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";
import { Input } from "~/src/components/shadcn/input";
import { Spinner } from "~/src/components/shadcn/spinner";

export interface GalleryAddTileProps {
  readonly disabled: boolean;
  readonly isUploading: boolean;
  readonly onFiles: (files: readonly File[]) => void;
}

/** The "add more" tile of the gallery: click-or-drop to append multiple files. */
export function GalleryAddTile({ disabled, isUploading, onFiles }: GalleryAddTileProps): JSX.Element {
  const t = useTranslations("admin.media");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files !== null) {
        onFiles([...event.target.files]);
      }
      event.target.value = "";
    },
    [onFiles]
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      if (!disabled) {
        setIsDraggingFile(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setIsDraggingFile(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setIsDraggingFile(false);
      if (!disabled) {
        onFiles([...event.dataTransfer.files]);
      }
    },
    [disabled, onFiles]
  );

  return (
    <li className="aspect-square">
      <Input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_ACCEPT_ATTR}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        onChange={handleInputChange}
      />
      <Button
        variant="outline"
        onClick={openPicker}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={disabled}
        className={cn(
          "size-full flex-col gap-1.5 rounded-lg border-dashed border-border/60 bg-muted/30 p-3 text-center whitespace-normal",
          "hover:border-foreground/40 hover:bg-muted/50",
          isDraggingFile && "border-foreground/60 bg-muted/60"
        )}
      >
        {isUploading && <Spinner className="size-5 text-muted-foreground" />}
        {!isUploading && <ImagePlus aria-hidden className="size-5 text-muted-foreground" strokeWidth={1.5} />}
        <span className="text-[11px] font-medium text-muted-foreground">{isUploading ? t("uploading") : t("addMore")}</span>
      </Button>
    </li>
  );
}
