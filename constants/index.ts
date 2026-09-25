export const navItems = [
  {
    name: "Dashboard",
    icon: "/assets/icons/dashboard.svg",
    url: "/",
  },
  {
    name: "Documents",
    icon: "/assets/icons/documents.svg",
    url: "/documents",
  },
  {
    name: "Images",
    icon: "/assets/icons/images.svg",
    url: "/images",
  },
  {
    name: "Media",
    icon: "/assets/icons/video.svg",
    url: "/media",
  },
  {
    name: "Others",
    icon: "/assets/icons/others.svg",
    url: "/others",
  },
  {
    name: "Folders",
    icon: "/assets/icons/folder.svg",
    url: "/folders",
  },
  {
    name: "Starred",
    icon: "/assets/icons/star.svg",
    url: "/starred",
  },
  {
    name: "AI Search",
    icon: "/assets/icons/search.svg",
    url: "/ai-search",
  },
  {
    name: "Trash",
    icon: "/assets/icons/trash.svg",
    url: "/trash",
  },
];

export const actionsDropdownItems = [
  {
    label: "Preview",
    icon: "/assets/icons/eye.svg",
    value: "preview",
  },
  {
    label: "Rename",
    icon: "/assets/icons/edit.svg",
    value: "rename",
  },
  {
    label: "Details",
    icon: "/assets/icons/info.svg",
    value: "details",
  },
  {
    label: "Share",
    icon: "/assets/icons/share.svg",
    value: "share",
  },
  {
    label: "Move to",
    icon: "/assets/icons/folder-light.svg",
    value: "move",
  },
  {
    label: "Download",
    icon: "/assets/icons/download.svg",
    value: "download",
  },
  {
    label: "Delete",
    icon: "/assets/icons/delete.svg",
    value: "delete",
  },
];

export const sortTypes = [
  {
    label: "Date created (newest)",
    value: "$createdAt-desc",
  },
  {
    label: "Created Date (oldest)",
    value: "$createdAt-asc",
  },
  {
    label: "Name (A-Z)",
    value: "name-asc",
  },
  {
    label: "Name (Z-A)",
    value: "name-desc",
  },
  {
    label: "Size (Highest)",
    value: "size-desc",
  },
  {
    label: "Size (Lowest)",
    value: "size-asc",
  },
];

export const avatarPlaceholderUrl =
  "https://img.freepik.com/free-psd/3d-illustration-person-with-sunglasses_23-2149436188.jpg";

export const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export const STORAGE_QUOTA_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
