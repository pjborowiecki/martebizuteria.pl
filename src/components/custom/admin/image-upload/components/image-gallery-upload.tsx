import { type DragEvent, type JSX, type KeyboardEvent, useCallback, useState } from "react";

import { cn } from "~/src/lib/utils";

import { GalleryAddTile } from "~/src/components/custom/admin/image-upload/components/gallery-add-tile";
import { GalleryItem } from "~/src/components/custom/admin/image-upload/components/gallery-item";
import {
  EMPTY_COUNT,
  FIRST_INDEX,
  MOVE_BACKWARD,
  MOVE_FORWARD,
  NOT_FOUND_INDEX
} from "~/src/components/custom/admin/image-upload/constants";
import { useImageUpload } from "~/src/components/custom/admin/image-upload/hooks/use-image-upload";
import { reorder } from "~/src/components/custom/admin/image-upload/lib/gallery.utils";
import type { GalleryImage, ImageUploadBaseProps } from "~/src/components/custom/admin/image-upload/lib/image-upload.types";

export interface ImageGalleryUploadProps extends ImageUploadBaseProps {
  /** Id of the image designated as main (e.g. the product thumbnail). */
  readonly mainId: string | undefined;
  /** Called with the next ordered list whenever images are added, removed or reordered. */
  readonly onChange: (images: readonly GalleryImage[]) => void;
  /** Called when the main image changes. */
  readonly onMainChange: (id: string | undefined) => void;
  /** Ordered list of images (display order). */
  readonly value: readonly GalleryImage[];
}

/**
 * Multi-image uploader with a draggable, reorderable gallery. Supports adding
 * many files at once, choosing a main image, reordering via drag or keyboard,
 * and removal. `value` is the display order; `mainId` designates the main image
 * independently of order (maps cleanly to a `thumbnail` + `images[]` schema).
 */
export function ImageGalleryUpload({
  className,
  disabled = false,
  folder = "uploads",
  mainId,
  onChange,
  onMainChange,
  onUploadingChange,
  value
}: ImageGalleryUploadProps): JSX.Element {
  const [draggingId, setDraggingId] = useState<string>();

  const { isUploading, uploadFiles } = useImageUpload(folder, onUploadingChange);

  const isBusy = disabled || isUploading;

  const handleFiles = useCallback(
    (files: readonly File[]) => {
      void (async () => {
        const urls = await uploadFiles(files);
        if (urls.length === EMPTY_COUNT) {
          return;
        }
        const added: GalleryImage[] = urls.map((url) => ({ id: crypto.randomUUID(), url }));
        const next = [...value, ...added];
        onChange(next);
        if (mainId === undefined) {
          onMainChange(next[FIRST_INDEX].id);
        }
      })();
    },
    [uploadFiles, value, onChange, mainId, onMainChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      const next = value.filter((image) => image.id !== id);
      onChange(next);
      if (mainId === id) {
        onMainChange(next.length === EMPTY_COUNT ? undefined : next[FIRST_INDEX].id);
      }
    },
    [value, onChange, mainId, onMainChange]
  );

  const moveByOffset = useCallback(
    (id: string, offset: number) => {
      const index = value.findIndex((image) => image.id === id);
      if (index === NOT_FOUND_INDEX) {
        return;
      }
      const target = index + offset;
      if (target < FIRST_INDEX || target >= value.length) {
        return;
      }
      onChange(reorder(value, id, value[target].id));
    },
    [value, onChange]
  );

  const handleDragStartItem = useCallback((id: string) => {
    setDraggingId(id);
  }, []);

  const handleDragEndItem = useCallback(() => {
    setDraggingId(undefined);
  }, []);

  const handleDragOverItem = useCallback(
    (event: DragEvent<HTMLElement>, overId: string) => {
      event.preventDefault();
      if (draggingId === undefined || draggingId === overId) {
        return;
      }
      onChange(reorder(value, draggingId, overId));
    },
    [draggingId, value, onChange]
  );

  const handleKeyReorder = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        moveByOffset(id, MOVE_BACKWARD);
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        moveByOffset(id, MOVE_FORWARD);
      }
    },
    [moveByOffset]
  );

  return (
    <div className={cn("w-full", className)}>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {value.map((image, index) => (
          <GalleryItem
            key={image.id}
            disabled={isBusy}
            image={image}
            index={index}
            isDragging={draggingId === image.id}
            isMain={image.id === mainId}
            onDragEndItem={handleDragEndItem}
            onDragOverItem={handleDragOverItem}
            onDragStartItem={handleDragStartItem}
            onKeyReorder={handleKeyReorder}
            onRemove={handleRemove}
            onSetMain={onMainChange}
            total={value.length}
          />
        ))}

        <GalleryAddTile disabled={isBusy} isUploading={isUploading} onFiles={handleFiles} />
      </ul>
    </div>
  );
}
