/* eslint-disable no-unused-vars */

declare type FileType = "document" | "image" | "video" | "audio" | "other";

declare interface SharedUser {
  $id: string;
  accountId?: string;
  email: string;
  fullName?: string;
}

declare interface UserRecord {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  accountId: string;
  fullName: string;
  email: string;
  avatar: string;
  emailVerified?: boolean;
}

declare interface FileRecord {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  type: FileType;
  name: string;
  url: string;
  extension: string;
  size: number;
  owner: string;
  accountId: string;
  bucketField: string;
  users: SharedUser[];
  folderId?: string;
  inTrash?: boolean;
  deletedAt?: string;
  favorite?: boolean;
  shareId?: string;
  sharePermission?: "view" | "edit";
  shareExpiry?: string;
  previousVersions?: FileVersion[];
}

declare interface FileVersion {
  bucketField: string;
  size: number;
  $createdAt: string;
}

declare interface ActionType {
  label: string;
  icon: string;
  value: string;
}

declare interface SearchParamProps {
  params?: Promise<SegmentParams>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

declare interface UploadFileProps {
  file: File;
  ownerId: string;
  accountId: string;
  path: string;
  folderId?: string;
}
declare interface GetFilesProps {
  types: string[];
  searchText?: string;
  sort?: string;
  limit?: number;
  folderId?: string;
  includeTrashed?: boolean;
}
declare interface Folder {
  $id: string;
  name: string;
  parentId: string;
  accountId: string;
  $createdAt: string;
  $updatedAt: string;
}
declare interface RenameFileProps {
  fileId: string;
  name: string;
  extension: string;
  path: string;
}
declare interface UpdateFileUsersProps {
  fileId: string;
  emails: string[];
  path: string;
}
declare interface DeleteFileProps {
  fileId: string;
  bucketField: string;
  path: string;
}

declare interface FileUploaderProps {
  ownerId: string;
  accountId: string;
  className?: string;
}

declare interface MobileNavigationProps {
  ownerId: string;
  accountId: string;
  fullName: string;
  avatar: string;
  email: string;
}
declare interface SidebarProps {
  fullName: string;
  avatar: string;
  email: string;
}

declare interface ThumbnailProps {
  type: string;
  extension: string;
  url: string;
  className?: string;
  imageClassName?: string;
}

declare interface ShareInputProps {
  file: FileRecord;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (email: string) => void;
}
