"use client";

import Thumbnail from "@/components/Thumbnail";
import FormattedDateTime from "@/components/FormattedDateTime";
import { convertFileSize, formatDateTime } from "@/lib/utils";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createShareLink, restoreFileVersion, revokeShareLink } from "@/lib/actions/file.actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SHARE_EXPIRY_OPTIONS = [
  { label: "Never expires", value: "never" },
  { label: "In 1 day", value: "1" },
  { label: "In 7 days", value: "7" },
  { label: "In 30 days", value: "30" },
];

const ImageThumbnail = ({ file }: { file: FileRecord }) => (
  <div className="file-details-thumbnail">
    <Thumbnail type={file.type} extension={file.extension} url={file.url} />
    <div className="flex flex-col">
      <p className="subtitle-2 mb-1">{file.name}</p>
      <FormattedDateTime date={file.$createdAt} className="caption" />
    </div>
  </div>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex">
    <p className="file-details-label text-left">{label}</p>
    <p className="file-details-value text-left">{value}</p>
  </div>
);

export const FileDetails = ({ file }: { file: FileRecord }) => {
  const path = usePathname();
  const [restoringIndex, setRestoringIndex] = useState<number | null>(null);
  const versions = file.previousVersions ?? [];

  const handleRestore = async (index: number) => {
    setRestoringIndex(index);
    try {
      await restoreFileVersion({
        fileId: file.$id,
        versionIndex: index,
        path,
      });
    } catch (error) {
      console.error("Failed to restore version:", error);
    } finally {
      setRestoringIndex(null);
    }
  };

  return (
    <>
      <ImageThumbnail file={file} />
      <div className="space-y-4 px-2 pt-2">
        <DetailRow label="Format:" value={file.extension} />
        <DetailRow label="Size:" value={convertFileSize(file.size)} />
        <DetailRow
          label="Owner:"
          value={
            (file.users as { fullName?: string }[] | undefined)?.[0]
              ?.fullName ?? "Unknown"
          }
        />
        <DetailRow label="Last edit:" value={formatDateTime(file.$updatedAt)} />

        {versions.length > 0 && (
          <div className="pt-2">
            <p className="subtitle-2 text-light-100">Version history</p>
            <ul className="flex flex-col gap-2 pt-2">
              {versions.map((version, index) => (
                <li
                  key={`${version.bucketField}-${index}`}
                  className="flex items-center justify-between gap-2"
                >
                  <p className="caption text-light-200">
                    {convertFileSize(version.size)} ·{" "}
                    {formatDateTime(version.$createdAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRestore(index)}
                    className="subtitle-2 text-brand hover:underline"
                  >
                    {restoringIndex === index ? "Restoring..." : "Restore"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
};

interface Props {
  file: FileRecord;
  onInputChange: React.Dispatch<React.SetStateAction<string[]>>;
  onRemove: (email: string) => void;
}

const ShareLinkSection = ({ file }: { file: FileRecord }) => {
  const path = usePathname();
  const [shareId, setShareId] = useState(file.shareId ?? null);
  const [permission, setPermission] = useState<"view" | "edit">(
    file.sharePermission ?? "view",
  );
  const [expiresInDays, setExpiresInDays] = useState("never");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = shareId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareId}`
    : "";

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const result = await createShareLink({
        fileId: file.$id,
        permission,
        expiresInDays:
          expiresInDays === "never" ? undefined : Number(expiresInDays),
        path,
      });
      if (result?.shareId) setShareId(result.shareId);
    } catch (error) {
      console.error("Failed to create share link:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async () => {
    setIsLoading(true);
    try {
      await revokeShareLink({ fileId: file.$id, path });
      setShareId(null);
    } catch (error) {
      console.error("Failed to revoke share link:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  return (
    <div className="share-wrapper">
      <p className="subtitle-2 pl-1 text-light-100">Public link</p>

      {shareId ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={shareUrl}
              className="share-input-field body-2"
            />
            <Button
              onClick={handleCopy}
              className="uploader-button shrink-0"
              type="button"
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <Button
            onClick={handleRevoke}
            disabled={isLoading}
            type="button"
            className="modal-cancel-button !bg-red/10 !text-red"
          >
            Revoke link
            {isLoading && (
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
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Select
              value={permission}
              onValueChange={(value) => setPermission(value as "view" | "edit")}
            >
              <SelectTrigger className="sort-select">
                <SelectValue placeholder="Permission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">Can view</SelectItem>
                <SelectItem value="edit">Can edit</SelectItem>
              </SelectContent>
            </Select>

            <Select value={expiresInDays} onValueChange={setExpiresInDays}>
              <SelectTrigger className="sort-select">
                <SelectValue placeholder="Expiry" />
              </SelectTrigger>
              <SelectContent>
                {SHARE_EXPIRY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleCreate}
            disabled={isLoading}
            type="button"
            className="uploader-button"
          >
            Create link
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
        </div>
      )}
    </div>
  );
};

export const ShareInput = ({ file, onInputChange, onRemove }: Props) => {
  return (
    <>
      <ImageThumbnail file={file} />

      <ShareLinkSection file={file} />

      <div className="share-wrapper">
        <p className="subtitle-2 pl-1 text-light-100">
          Share file with other users
        </p>
        <Input
          type="email"
          placeholder="Enter email address"
          onChange={(e) => onInputChange(e.target.value.trim().split(","))}
          className="share-input-field"
        />
        <div className="pt-4">
          <div className="flex justify-between">
            <p className="subtitle-2 text-light-100">Shared with</p>
            <p className="subtitle-2 text-light-200">
              {(file.users as unknown[] | undefined)?.length ?? 0} users
            </p>
          </div>

          <ul className="pt-2">
            {(file.users as { $id: string; email: string }[] | undefined)?.map(
              (user) => (
                <li
                  key={user.$id}
                  className="flex items-center justify-between gap-2"
                >
                  <p className="subtitle-2">{user.email}</p>
                  <Button
                    onClick={() => onRemove(user.email)}
                    className="share-remove-user"
                  >
                    <Image
                      src="/assets/icons/remove.svg"
                      alt="Remove"
                      width={24}
                      height={24}
                      className="remove-icon"
                    />
                  </Button>
                </li>
              ),
            )}
          </ul>
        </div>
      </div>
    </>
  );
};
