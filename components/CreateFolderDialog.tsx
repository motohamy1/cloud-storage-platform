"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createFolder } from "@/lib/actions/folder.actions";

const CreateFolderDialog = ({
  parentId = "root",
  className,
}: {
  parentId?: string;
  className?: string;
}) => {
  const path = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setError(null);
    setIsOpen(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Please enter a folder name");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await createFolder({ name: name.trim(), parentId, path });
      reset();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create folder",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => (open ? setIsOpen(true) : reset())}
    >
      <DialogTrigger asChild>
        <Button className={className ?? "uploader-button"}>
          <Image
            src="/assets/icons/folder.svg"
            alt="new folder"
            width={24}
            height={24}
          />
          <p>New folder</p>
        </Button>
      </DialogTrigger>

      <DialogContent className="shad-dialog button">
        <DialogHeader className="flex flex-col gap-3">
          <DialogTitle className="text-center text-light-100">
            Create new folder
          </DialogTitle>
          <Input
            type="text"
            placeholder="Folder name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleCreate();
            }}
          />
          {error && <p className="body-2 text-red text-center">{error}</p>}
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-3 md:flex-row">
          <Button onClick={reset} className="modal-cancel-button">
            Cancel
          </Button>
          <Button onClick={handleCreate} className="modal-submit-button">
            <p className="capitalize">Create</p>
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

export default CreateFolderDialog;
