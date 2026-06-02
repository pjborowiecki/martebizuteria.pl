import { type ChangeEvent, type DragEvent, type JSX, useCallback, useEffect, useRef, useState } from "react";

import { ACCEPTED_IMAGE_ACCEPT_ATTR } from "~/src/integrations/cloudflare-r2/media.zod";

import { cn } from "~/src/lib/utils";

import { Input } from "~/src/components/shadcn/input";

import { UploadDropzone } from "~/src/components/custom/admin/image-upload/components/upload-dropzone";
import { UploadedPreview } from "~/src/components/custom/admin/image-upload/components/uploaded-preview";
import { FIRST_INDEX } from "~/src/components/custom/admin/image-upload/constants";
import { useImageUpload } from "~/src/components/custom/admin/image-upload/hooks/use-image-upload";
import type { ImageUploadBaseProps } from "~/src/components/custom/admin/image-upload/lib/image-upload.types";

export interface ImageUploadProps extends ImageUploadBaseProps {
  readonly invalid?: boolean;
  readonly onChange: (url: string) => void;
  readonly value: string;
}

/**
 * Single-image uploader: drag-and-drop or click, instant local preview, and a
 * direct upload to R2. Reports the public (CDN-optimizable) URL via `onChange`.
 */
export function ImageUpload({
  className,
  disabled = false,
  folder = "uploads",
  invalid = false,
  onChange,
  onUploadingChange,
  value
}: ImageUploadProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string>();
  const [isDragging, setIsDragging] = useState(false);

  const { isUploading, uploadFiles } = useImageUpload(folder, onUploadingChange);

  // Revoke the object URL whenever the preview changes or the component unmounts.
  useEffect(() => {
    if (localPreview === undefined) {
      return;
    }
    return () => {
      URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (file === undefined) {
        return;
      }
      setLocalPreview(URL.createObjectURL(file));
      const [url] = await uploadFiles([file]);
      setLocalPreview(undefined);
      if (url !== undefined) {
        onChange(url);
      }
    },
    [uploadFiles, onChange]
  );

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      void handleFile(event.target.files?.[FIRST_INDEX]);
      event.target.value = "";
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setLocalPreview(undefined);
    onChange("");
  }, [onChange]);

  const isBusy = disabled || isUploading;

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      if (!isBusy) {
        setIsDragging(true);
      }
    },
    [isBusy]
  );

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (!isBusy) {
        void handleFile(event.dataTransfer.files?.[FIRST_INDEX]);
      }
    },
    [handleFile, isBusy]
  );

  const hasImage = value !== "" || (isUploading && localPreview !== undefined);
  const overlaySrc = localPreview ?? value;

  return (
    <div className={cn("w-full max-w-[320px]", className)}>
      <Input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_ACCEPT_ATTR}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        disabled={isBusy}
        onChange={handleInputChange}
      />

      {hasImage ? (
        <UploadedPreview
          disabled={disabled}
          isUploading={isUploading}
          onPick={openPicker}
          onRemove={handleRemove}
          overlaySrc={overlaySrc}
          value={value}
        />
      ) : (
        <UploadDropzone
          disabled={isBusy}
          invalid={invalid}
          isDragging={isDragging}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onPick={openPicker}
        />
      )}
    </div>
  );
}
