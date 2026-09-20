import { type DragEvent, type JSX, type KeyboardEvent, useCallback, useState } from "react"

import { cn } from "cn"

import { GalleryAddTile } from "~/src/presentation/components/custom/image-upload/components/gallery-add-tile"
import { GalleryItem } from "~/src/presentation/components/custom/image-upload/components/gallery-item"
import {
  EMPTY_COUNT,
  FIRST_INDEX,
  MOVE_BACKWARD,
  MOVE_FORWARD,
  NOT_FOUND_INDEX,
  REMOVE_ONE,
} from "~/src/presentation/components/custom/image-upload/constants"
import { useImageUpload } from "~/src/presentation/components/custom/image-upload/hooks/use-image-upload"
import { reorder } from "~/src/presentation/components/custom/image-upload/lib/gallery.utils"
import { type GalleryImage, type ImageUploadBaseProps } from "~/src/presentation/components/custom/image-upload/lib/image-upload.types"
/** The first image is the thumbnail; setting a main image moves it to the front. */
export const ImageGalleryUpload = ({
  className,
  disabled = false,
  folder = "uploads",
  mainId,
  onChange,
  onMainChange,
  onUploadingChange,
  value,
}: ImageGalleryUploadProps): JSX.Element => {
  const [draggingId, setDraggingId] = useState<string>()
  const { isUploading, uploadFiles } = useImageUpload(folder, onUploadingChange)
  const isBusy = disabled || isUploading
  const applyOrder = useCallback(
    (next: readonly GalleryImage[]) => {
      onChange(next)
      onMainChange(next[FIRST_INDEX]?.id)
    },
    [onChange, onMainChange],
  )
  const handleFiles = useCallback(
    (files: readonly File[]) => {
      void (async () => {
        const urls = await uploadFiles(files)
        if (urls.length === EMPTY_COUNT) {
          return
        }
        const added: GalleryImage[] = urls.map((url) => ({
          id: crypto.randomUUID(),
          url,
        }))
        const next = [...value, ...added]
        applyOrder(next)
      })()
    },
    [applyOrder, uploadFiles, value],
  )
  const handleRemove = useCallback(
    (id: string) => {
      const next = value.filter((image) => image.id !== id)
      applyOrder(next)
    },
    [applyOrder, value],
  )
  const handleSetMain = useCallback(
    (id: string) => {
      const index = value.findIndex((image) => image.id === id)
      const moved = value[index]
      if (moved === undefined || index === FIRST_INDEX) {
        return
      }
      applyOrder([moved, ...value.toSpliced(index, REMOVE_ONE)])
    },
    [applyOrder, value],
  )
  const moveByOffset = useCallback(
    (id: string, offset: number) => {
      const index = value.findIndex((image) => image.id === id)
      if (index === NOT_FOUND_INDEX) {
        return
      }
      const target = value[index + offset]
      if (target === undefined) {
        return
      }
      applyOrder(reorder(value, id, target.id))
    },
    [applyOrder, value],
  )
  const handleDragStartItem = useCallback((id: string) => {
    setDraggingId(id)
  }, [])
  const handleDragEndItem = useCallback(() => {
    setDraggingId(undefined)
  }, [])
  const handleDragOverItem = useCallback(
    (event: DragEvent<HTMLElement>, overId: string) => {
      event.preventDefault()
      if (draggingId === undefined || draggingId === overId) {
        return
      }
      applyOrder(reorder(value, draggingId, overId))
    },
    [applyOrder, draggingId, value],
  )
  const handleKeyReorder = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault()
        moveByOffset(id, MOVE_BACKWARD)
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault()
        moveByOffset(id, MOVE_FORWARD)
      }
    },
    [moveByOffset],
  )
  const isEmpty = value.length === EMPTY_COUNT
  if (isEmpty) {
    return (
      <div className={cn("w-full", className)}>
        <GalleryAddTile disabled={isBusy} isUploading={isUploading} layout="dropzone" onFiles={handleFiles} />
      </div>
    )
  }
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
            onSetMain={handleSetMain}
            total={value.length}
          />
        ))}

        <GalleryAddTile disabled={isBusy} isUploading={isUploading} onFiles={handleFiles} />
      </ul>
    </div>
  )
}
export interface ImageGalleryUploadProps extends ImageUploadBaseProps {
  readonly mainId: string | undefined
  /** Receives the full next list, in display order, on every add, remove or reorder. */
  readonly onChange: (images: readonly GalleryImage[]) => void
  readonly onMainChange: (id: string | undefined) => void
  readonly value: readonly GalleryImage[]
}
