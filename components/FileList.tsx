"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import ActionDropdown from "@/components/ActionDropdown";
import { FormattedDateTime } from "@/components/FormattedDateTime";
import { Thumbnail } from "@/components/Thumbnail";
import { Button } from "@/components/ui/button";
import BulkMoveDialog from "@/components/BulkMoveDialog";
import { deleteFilesBulk } from "@/lib/actions/file.actions";
import { cn } from "@/lib/utils";

interface Props {
  files: FileRecord[];
  emptyMessage?: string;
}

const FileList = ({
  files,
  emptyMessage = "No files uploaded",
}: Props) => {
  const path = usePathname();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const allSelected =
    files.length > 0 && selectedIds.length === files.length;

  const toggleFile = (fileId: string) => {
    setSelectedIds((previous) =>
      previous.includes(fileId)
        ? previous.filter((id) => id !== fileId)
        : [...previous, fileId],
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : files.map((file) => file.$id));
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    try {
      await deleteFilesBulk({ fileIds: selectedIds, path });
      exitSelectionMode();
    } catch (error) {
      console.error("Failed to delete selected files:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (files.length === 0) {
    return <p className="empty-list">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {selectionMode ? (
          <>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className={cn(
                  "flex size-5 items-center justify-center rounded border transition-colors",
                  allSelected
                    ? "border-brand bg-brand"
                    : "border-light-200 bg-background",
                )}
                aria-label="Select all"
              >
                {allSelected && (
                  <Image
                    src="/assets/icons/check.svg"
                    alt=""
                    width={12}
                    height={12}
                  />
                )}
              </button>
              <p className="subtitle-2 text-light-100">
                {selectedIds.length} selected
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => setIsMoveDialogOpen(true)}
                disabled={selectedIds.length === 0}
                className="uploader-button h-9 px-4"
              >
                Move to
              </Button>
              <Button
                onClick={handleBulkDelete}
                disabled={selectedIds.length === 0 || isDeleting}
                className="modal-cancel-button h-9 !bg-red/10 px-4 !text-red"
              >
                Delete
                {isDeleting && (
                  <Image
                    src="/assets/icons/loader.svg"
                    alt="loader"
                    width={16}
                    height={16}
                    className="animate-spin"
                  />
                )}
              </Button>
              <Button
                onClick={exitSelectionMode}
                className="modal-cancel-button h-9 px-4"
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <Button
            onClick={() => setSelectionMode(true)}
            className="modal-cancel-button ml-auto h-9 px-4"
          >
            Select
          </Button>
        )}
      </div>

      <ul className="flex flex-col gap-5">
        {files.map((file) => {
          const isSelected = selectedIds.includes(file.$id);

          return (
            <li
              key={file.$id}
              className={cn(
                "flex items-center gap-3 rounded-xl transition-colors",
                isSelected && "bg-brand/5",
              )}
            >
              {selectionMode && (
                <button
                  type="button"
                  onClick={() => toggleFile(file.$id)}
                  className={cn(
                    "ml-2 flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                    isSelected
                      ? "border-brand bg-brand"
                      : "border-light-200 bg-background",
                  )}
                  aria-label={`Select ${file.name}`}
                >
                  {isSelected && (
                    <Image
                      src="/assets/icons/check.svg"
                      alt=""
                      width={12}
                      height={12}
                    />
                  )}
                </button>
              )}

              <Link
                href={`/api/files/${file.$id}`}
                target="_blank"
                className="flex flex-1 items-center gap-3"
              >
                <Thumbnail
                  type={file.type}
                  extension={file.extension}
                  url={file.url}
                />

                <div className="recent-file-details">
                  <div className="flex flex-col gap-1">
                    <p className="recent-file-name">{file.name}</p>
                    <FormattedDateTime
                      date={file.$createdAt}
                      className="caption"
                    />
                  </div>
                </div>
              </Link>

              {!selectionMode && <ActionDropdown file={file} />}
            </li>
          );
        })}
      </ul>

      <BulkMoveDialog
        fileIds={selectedIds}
        isOpen={isMoveDialogOpen}
        onClose={() => {
          setIsMoveDialogOpen(false);
          exitSelectionMode();
        }}
      />
    </div>
  );
};

export default FileList;
