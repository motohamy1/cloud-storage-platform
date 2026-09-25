"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteFolder, renameFolder } from "@/lib/actions/folder.actions";
import { FormattedDateTime } from "@/components/FormattedDateTime";

type FolderAction = "rename" | "delete";

const FolderCard = ({ folder }: { folder: Folder }) => {
  const path = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [action, setAction] = useState<FolderAction | null>(null);
  const [name, setName] = useState(folder.name);
  const [isLoading, setIsLoading] = useState(false);

  const closeAllModals = () => {
    setIsModalOpen(false);
    setIsDropdownOpen(false);
    setAction(null);
    setName(folder.name);
  };

  const handleAction = async () => {
    if (!action) return;
    setIsLoading(true);

    try {
      if (action === "rename") {
        await renameFolder({ folderId: folder.$id, name, path });
      } else {
        await deleteFolder({ folderId: folder.$id, path });
      }
      closeAllModals();
    } catch (error) {
      console.error("Folder action failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="file-card flex-col !items-start gap-3">
      <div className="flex w-full items-start justify-between">
        <Link
          href={`/folders/${folder.$id}`}
          className="flex items-center gap-4"
        >
          <Image
            src="/assets/icons/folder-brand.svg"
            alt="folder"
            width={44}
            height={44}
          />
          <div>
            <p className="subtitle-2 line-clamp-1 text-light-100">
              {folder.name}
            </p>
            <FormattedDateTime
              date={folder.$createdAt}
              className="caption text-light-200"
            />
          </div>
        </Link>

        <DropdownMenu
          open={isDropdownOpen}
          onOpenChange={setIsDropdownOpen}
        >
          <DropdownMenuTrigger className="shad-no-focus">
            <Image
              src="/assets/icons/dots.svg"
              alt="dots"
              width={34}
              height={34}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel className="max-w-[200px] truncate">
              {folder.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="shad-dropdown-item"
              onClick={() => {
                setAction("rename");
                setIsModalOpen(true);
              }}
            >
              <div className="flex items-center gap-2">
                <Image
                  src="/assets/icons/edit.svg"
                  alt="rename"
                  width={30}
                  height={30}
                />
                Rename
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="shad-dropdown-item"
              onClick={() => {
                setAction("delete");
                setIsModalOpen(true);
              }}
            >
              <div className="flex items-center gap-2">
                <Image
                  src="/assets/icons/delete.svg"
                  alt="delete"
                  width={30}
                  height={30}
                />
                Delete
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="shad-dialog button">
          <DialogHeader className="flex flex-col gap-3">
            <DialogTitle className="text-center text-light-100">
              {action === "rename" ? "Rename folder" : "Delete folder"}
            </DialogTitle>
            {action === "rename" && (
              <Input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            )}
            {action === "delete" && (
              <p className="delete-confirmation">
                Are you sure you want to delete{" "}
                <span className="delete-file-name">{folder.name}</span>? Files
                inside will be moved to Trash.
              </p>
            )}
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-3 md:flex-row">
            <Button onClick={closeAllModals} className="modal-cancel-button">
              Cancel
            </Button>
            <Button onClick={handleAction} className="modal-submit-button">
              <p className="capitalize">{action}</p>
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
    </div>
  );
};

export default FolderCard;
