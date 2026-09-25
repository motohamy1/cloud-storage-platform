"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { emptyTrash } from "@/lib/actions/file.actions";

const EmptyTrashButton = () => {
  const path = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  const handleEmptyTrash = async () => {
    if (
      !window.confirm(
        "Permanently delete all items in Trash? This cannot be undone.",
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      await emptyTrash({ path });
    } catch (error) {
      console.error("Failed to empty trash:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleEmptyTrash}
      disabled={isLoading}
      className="modal-cancel-button !bg-red/10 !text-red"
    >
      <p>Empty trash</p>
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
  );
};

export default EmptyTrashButton;
