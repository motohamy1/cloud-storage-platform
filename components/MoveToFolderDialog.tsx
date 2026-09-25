"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFolders, moveFileToFolder } from "@/lib/actions/folder.actions";

const MoveToFolderDialog = ({
  file,
  isOpen,
  onClose,
}: {
  file: FileRecord;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const path = usePathname();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("root");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchFolders = async () => {
      setIsFetching(true);
      try {
        const allFolders = await getFolders({
          accountId: file.accountId,
          parentId: "root",
        });
        setFolders(allFolders ?? []);
      } catch (error) {
        console.error("Failed to load folders:", error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchFolders();
  }, [isOpen, file.accountId]);

  const handleMove = async () => {
    setIsLoading(true);
    try {
      await moveFileToFolder({
        fileId: file.$id,
        folderId: selectedFolder,
        path,
      });
      onClose();
    } catch (error) {
      console.error("Failed to move file:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="shad-dialog button">
        <DialogHeader className="flex flex-col gap-3">
          <DialogTitle className="text-center text-light-100">
            Move to
          </DialogTitle>
          <p className="body-2 line-clamp-1 text-light-200">{file.name}</p>
        </DialogHeader>

        <ul className="flex max-h-64 flex-col gap-2 overflow-auto custom-scrollbar">
          <li>
            <button
              type="button"
              onClick={() => setSelectedFolder("root")}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                selectedFolder === "root"
                  ? "bg-brand/10 text-brand"
                  : "text-light-100 hover:bg-light-400"
              }`}
            >
              My files
            </button>
          </li>

          {isFetching && (
            <li className="caption px-4 py-2 text-light-200">Loading...</li>
          )}

          {folders.map((folder) => (
            <li key={folder.$id}>
              <button
                type="button"
                onClick={() => setSelectedFolder(folder.$id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                  selectedFolder === folder.$id
                    ? "bg-brand/10 text-brand"
                    : "text-light-100 hover:bg-light-400"
                }`}
              >
                <Image
                  src="/assets/icons/folder-light.svg"
                  alt="folder"
                  width={24}
                  height={24}
                />
                <span className="subtitle-2 line-clamp-1">{folder.name}</span>
              </button>
            </li>
          ))}

          {!isFetching && folders.length === 0 && (
            <li className="caption px-4 py-2 text-light-200">
              No folders yet — create one first.
            </li>
          )}
        </ul>

        <DialogFooter className="flex flex-col gap-3 md:flex-row">
          <Button onClick={onClose} className="modal-cancel-button">
            Cancel
          </Button>
          <Button onClick={handleMove} className="modal-submit-button">
            <p className="capitalize">Move</p>
            {isLoading && (
              <Image
                src="/assets/icons/loader.svg"
                alt="loader"
                width={24}
                height={24}
                className="animate-spin"
              />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MoveToFolderDialog;
