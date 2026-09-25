"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { permanentlyDeleteFile, restoreFile } from "@/lib/actions/file.actions";

const TrashFileActions = ({ file }: { file: FileRecord }) => {
  const path = usePathname();
  const [isLoading, setIsLoading] = useState<"restore" | "delete" | null>(
    null,
  );

  const handleRestore = async () => {
    setIsLoading("restore");
    try {
      await restoreFile({ fileId: file.$id, path });
    } catch (error) {
      console.error("Failed to restore file:", error);
    } finally {
      setIsLoading(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (
      !window.confirm(
        `Permanently delete "${file.name}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    setIsLoading("delete");
    try {
      await permanentlyDeleteFile({
        fileId: file.$id,
        bucketField: file.bucketField,
        path,
      });
    } catch (error) {
      console.error("Failed to permanently delete file:", error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-3">
      <Button
        onClick={handleRestore}
        disabled={isLoading !== null}
        className="uploader-button h-9 px-4"
      >
        <p>Restore</p>
        {isLoading === "restore" && (
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
        onClick={handlePermanentDelete}
        disabled={isLoading !== null}
        className="modal-cancel-button h-9 !bg-red/10 px-4 !text-red"
      >
        <p>Delete forever</p>
        {isLoading === "delete" && (
          <Image
            src="/assets/icons/loader.svg"
            alt="loader"
            width={16}
            height={16}
            className="animate-spin"
          />
        )}
      </Button>
    </div>
  );
};

export default TrashFileActions;
