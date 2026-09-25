"use client";

import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { convertFileSize, constructDownloadUrl } from "@/lib/utils";

const FilePreviewModal = ({
  file,
  isOpen,
  onClose,
}: {
  file: FileRecord | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!file) return null;

  const fileUrl = `/api/files/${file.$id}`;

  const renderPreview = () => {
    switch (file.type) {
      case "image":
        return (
          <div className="flex max-h-[70vh] items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl}
              alt={file.name}
              className="max-h-[70vh] max-w-full rounded-lg object-contain"
            />
          </div>
        );

      case "video":
        return (
          <video
            controls
            src={fileUrl}
            className="max-h-[70vh] w-full rounded-lg bg-dark-200"
          />
        );

      case "audio":
        return (
          <div className="flex w-full flex-col items-center gap-6 py-10">
            <Image
              src="/assets/icons/file-audio.svg"
              alt="audio"
              width={96}
              height={96}
            />
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={fileUrl} className="w-full" />
          </div>
        );

      case "document":
        if (file.extension === "pdf") {
          return (
            <iframe
              src={fileUrl}
              title={file.name}
              className="h-[70vh] w-full rounded-lg border border-light-300"
            />
          );
        }
        return renderFallback();

      default:
        return renderFallback();
    }
  };

  const renderFallback = () => (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <Image
        src="/assets/icons/file-other.svg"
        alt="file"
        width={80}
        height={80}
      />
      <div className="flex flex-col gap-1">
        <p className="subtitle-2 text-light-100">
          No preview available for this file type
        </p>
        <p className="body-2 text-light-200">
          Download it to view the contents
        </p>
      </div>
      <Button asChild className="uploader-button">
        <Link href={constructDownloadUrl(file.$id)} download={file.name}>
          Download
        </Link>
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="shad-dialog max-w-4xl">
        <DialogHeader className="flex flex-col gap-1">
          <DialogTitle className="text-left text-light-100">
            {file.name}
          </DialogTitle>
          <p className="caption text-light-200">
            {convertFileSize(file.size)} ·{" "}
            {file.extension.toUpperCase() || "File"}
          </p>
        </DialogHeader>

        {renderPreview()}
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewModal;
