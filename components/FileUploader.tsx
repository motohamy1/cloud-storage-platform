"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn, convertFileToUrl, getFileType } from "@/lib/utils";
import Thumbnail from "@/components/Thumbnail";
import { MAX_FILE_SIZE } from "@/constants";
import { useToast } from "@/hooks/use-toast";

interface Props {
  ownerId: string;
  accountId: string;
  className?: string;
  folderId?: string;
}

interface UploadItem {
  file: File;
  progress: number;
  status: "uploading" | "error";
  error?: string;
}

const FileUploader = ({ className, folderId = "root" }: Props) => {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<UploadItem[]>([]);

  const updateItem = (file: File, patch: Partial<UploadItem>) => {
    setItems((previous) =>
      previous.map((item) => (item.file === file ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (file: File) => {
    setItems((previous) => previous.filter((item) => item.file !== file));
  };

  const uploadWithProgress = useCallback(
    (file: File) =>
      new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderId", folderId);

        xhr.upload.addEventListener("progress", (event) => {
          if (!event.lengthComputable) return;
          const progress = Math.round((event.loaded / event.total) * 100);
          updateItem(file, { progress, status: "uploading", error: undefined });
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            removeItem(file);
            resolve();
            return;
          }

          let message = `Upload failed (${xhr.status})`;
          try {
            message = JSON.parse(xhr.responseText)?.error || message;
          } catch {
            // response was not JSON
          }

          updateItem(file, { status: "error", error: message });
          reject(new Error(message));
        });

        xhr.addEventListener("error", () => {
          updateItem(file, {
            status: "error",
            error: "Network error. Check your connection and retry.",
          });
          reject(new Error("Network error"));
        });

        xhr.open("POST", "/api/files/upload");
        xhr.send(formData);
      }),
    [folderId],
  );

  const startUpload = useCallback(
    async (file: File) => {
      setItems((previous) => [
        ...previous.filter((item) => item.file !== file),
        { file, progress: 0, status: "uploading" },
      ]);

      try {
        await uploadWithProgress(file);
        router.refresh();
      } catch {
        // error state already rendered on the item row
      }
    },
    [uploadWithProgress, router],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          toast({
            description: (
              <p className="body-2 text-white">
                <span className="font-semibold">{file.name}</span> is too large.
                Max file size is {Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB.
              </p>
            ),
            className: "error-toast",
          });
          continue;
        }

        await startUpload(file);
      }
    },
    [startUpload, toast],
  );

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  const handleRemoveItem = (
    event: React.MouseEvent<HTMLImageElement, MouseEvent>,
    file: File,
  ) => {
    event.stopPropagation();
    removeItem(file);
  };

  return (
    <div {...getRootProps()} className="cursor-pointer">
      <input {...getInputProps()} />
      <Button type="button" className={cn("uploader-button", className)}>
        <Image
          src="/assets/icons/upload.svg"
          alt="upload"
          width={24}
          height={24}
        />{" "}
        <p>Upload</p>
      </Button>

      {items.length > 0 && (
        <ul className="uploader-preview-list">
          <h4 className="h4 text-light-100">Uploading</h4>

          {items.map(({ file, progress, status, error }) => {
            const { type, extension } = getFileType(file.name);

            return (
              <li key={file.name} className="uploader-preview-item flex-col">
                <div className="flex w-full items-center gap-3">
                  <Thumbnail
                    type={type}
                    extension={extension}
                    url={convertFileToUrl(file)}
                  />

                  <div className="preview-item-name w-full">
                    <p className="subtitle-2 line-clamp-1 text-light-100">
                      {file.name}
                    </p>
                    {status === "uploading" ? (
                      <span className="caption text-light-200">
                        {progress}%
                      </span>
                    ) : (
                      <span className="caption text-red line-clamp-1">
                        {error}
                      </span>
                    )}
                  </div>

                  {status === "uploading" ? (
                    <Image
                      src="/assets/icons/file-loader.gif"
                      width={80}
                      height={26}
                      alt="Uploading"
                    />
                  ) : (
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          startUpload(file);
                        }}
                        className="subtitle-2 text-brand hover:underline"
                      >
                        Retry
                      </button>
                      <Image
                        src="/assets/icons/remove.svg"
                        width={24}
                        height={24}
                        alt="Remove"
                        onClick={(event) => handleRemoveItem(event, file)}
                      />
                    </div>
                  )}
                </div>

                {status === "uploading" && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-light-400">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FileUploader;
