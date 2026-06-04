import { type DragEvent, type JSX, type KeyboardEvent, useCallback } from "react";

import { Star, X } from "lucide-react";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";

import { POSITION_OFFSET } from "~/src/components/custom/admin/image-upload/constants";
import type { GalleryImage } from "~/src/components/custom/admin/image-upload/lib/image-upload.types";
import { Image } from "~/src/components/custom/image";

export interface GalleryItemProps {
  readonly disabled: boolean;
  readonly image: GalleryImage;
  readonly index: number;
  readonly isDragging: boolean;
  readonly isMain: boolean;
  readonly onDragEndItem: () => void;
  readonly onDragOverItem: (event: DragEvent<HTMLElement>, overId: string) => void;
  readonly onDragStartItem: (id: string) => void;
  readonly onKeyReorder: (event: KeyboardEvent<HTMLButtonElement>, id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onSetMain: (id: string) => void;
  readonly total: number;
}

/** A single draggable, reorderable gallery thumbnail with set-main and remove actions. */
export function GalleryItem({
  disabled,
  image,
  index,
  isDragging,
  isMain,
  onDragEndItem,
  onDragOverItem,
  onDragStartItem,
  onKeyReorder,
  onRemove,
  onSetMain,
  total
}: GalleryItemProps): JSX.Element {
  const t = useTranslations("pages.admin.media");

  const handleDragStart = useCallback(() => {
    onDragStartItem(image.id);
  }, [onDragStartItem, image.id]);

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      onDragOverItem(event, image.id);
    },
    [onDragOverItem, image.id]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      onDragEndItem();
    },
    [onDragEndItem]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      onKeyReorder(event, image.id);
    },
    [onKeyReorder, image.id]
  );

  const handleSetMain = useCallback(() => {
    onSetMain(image.id);
  }, [onSetMain, image.id]);

  const handleRemove = useCallback(() => {
    onRemove(image.id);
  }, [onRemove, image.id]);

  return (
    <li className="group/item relative aspect-square">
      <Button
        draggable={!disabled}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={onDragEndItem}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        aria-label={t("reorderAria", { position: index + POSITION_OFFSET, total })}
        className={cn(
          "absolute inset-0 size-full cursor-grab overflow-hidden rounded-lg border bg-muted p-0 active:translate-y-0 active:cursor-grabbing",
          isMain ? "border-foreground ring-2 ring-foreground" : "border-border",
          isDragging && "opacity-40"
        )}
      >
        <Image src={image.url} alt="" width={240} height={240} className="absolute inset-0 size-full object-cover" />
      </Button>

      {isMain && (
        <span className="pointer-events-none absolute top-1.5 left-1.5 z-10 inline-flex items-center gap-1 rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">
          <Star aria-hidden className="size-2.5 fill-current" strokeWidth={0} />
          {t("main")}
        </span>
      )}

      <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end gap-1 p-1.5 opacity-0 transition-opacity group-focus-within/item:opacity-100 group-hover/item:opacity-100">
        {!isMain && (
          <Button
            variant="secondary"
            size="icon-xs"
            disabled={disabled}
            onClick={handleSetMain}
            title={t("setMain")}
            aria-label={t("setMain")}
            className="pointer-events-auto rounded-md bg-background/90 text-foreground shadow-sm hover:bg-background"
          >
            <Star aria-hidden className="size-3.5" strokeWidth={1.5} />
          </Button>
        )}
        <Button
          variant="secondary"
          size="icon-xs"
          disabled={disabled}
          onClick={handleRemove}
          title={t("remove")}
          aria-label={t("remove")}
          className="pointer-events-auto rounded-md bg-background/90 text-foreground shadow-sm hover:bg-destructive hover:text-destructive-foreground"
        >
          <X aria-hidden className="size-3.5" strokeWidth={1.5} />
        </Button>
      </div>
    </li>
  );
}
