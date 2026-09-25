"use server";

import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getFirebaseAdmin } from "@/lib/firebase";
import { getCurrentUser, getUserByEmail } from "@/lib/actions/user.actions";
import { getFileType, parseStringify } from "@/lib/utils";
import { STORAGE_QUOTA_BYTES } from "@/constants";

const handleError = (error: unknown, message: string) => {
  console.error(message, error);
  throw new Error(message);
};

const toIsoString = (value: unknown) => {
  if (value && typeof value === "object" && "toDate" in value) {
    const timestamp = value as { toDate: () => Date };
    return timestamp.toDate().toISOString();
  }
  if (typeof value === "string") return value;
  return "";
};

const serializeFile = (id: string, data: Record<string, unknown>): FileRecord => ({
  $id: id,
  $createdAt: toIsoString(data.createdAt),
  $updatedAt: toIsoString(data.updatedAt),
  type: data.type as FileType,
  name: String(data.name ?? ""),
  url: String(data.url ?? `/api/files/${id}`),
  extension: String(data.extension ?? ""),
  size: Number(data.size ?? 0),
  owner: String(data.owner ?? ""),
  accountId: String(data.accountId ?? ""),
  bucketField: String(data.bucketField ?? ""),
  users: Array.isArray(data.users) ? (data.users as SharedUser[]) : [],
  folderId: String(data.folderId ?? "root"),
  inTrash: data.inTrash === true,
  deletedAt: data.deletedAt ? toIsoString(data.deletedAt) : undefined,
  favorite: data.favorite === true,
  shareId: data.shareId ? String(data.shareId) : undefined,
  sharePermission: data.sharePermission as FileRecord["sharePermission"],
  shareExpiry: data.shareExpiry ? toIsoString(data.shareExpiry) : undefined,
  previousVersions: Array.isArray(data.previousVersions)
    ? (data.previousVersions as FileVersion[])
    : [],
});

const getFilesCollection = () => getFirebaseAdmin().firestore.collection("files");

const getStorageBucket = () => {
  const { storage } = getFirebaseAdmin();
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  return bucketName ? storage.bucket(bucketName) : storage.bucket();
};

const getUserSummary = (user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) => ({
  $id: user.$id,
  accountId: user.accountId,
  email: user.email,
  fullName: user.fullName,
});

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export const saveUploadedFile = async ({
  file,
  folderId = "root",
  currentUser,
}: {
  file: File;
  folderId?: string;
  currentUser: CurrentUser;
}) => {
  const usage = await getTotalSpaceUsed(currentUser.accountId);
  if (usage && usage.used + file.size > STORAGE_QUOTA_BYTES) {
    throw new Error(
      "Storage quota exceeded. Free up space or upgrade your plan to upload this file.",
    );
  }

  const { type, extension } = getFileType(file.name);
  const fileId = randomUUID();
  const storagePath = `users/${currentUser.accountId}/${fileId}/${file.name}`;
  const bucket = getStorageBucket();
  const fileReference = bucket.file(storagePath);

  // A same-name upload in the same folder becomes a new version of the file
  const existingSnapshot = await getFilesCollection()
    .where("accountId", "==", currentUser.accountId)
    .where("name", "==", file.name)
    .where("folderId", "==", folderId)
    .get();

  const existingFile = existingSnapshot.docs.find(
    (document) => document.data().inTrash !== true,
  );

  const previousVersions: FileVersion[] = existingFile
    ? [
        {
          bucketField: String(existingFile.data().bucketField ?? ""),
          size: Number(existingFile.data().size ?? 0),
          $createdAt: toIsoString(existingFile.data().$createdAt) ||
            toIsoString(existingFile.data().createdAt),
        },
        ...((existingFile.data().previousVersions as FileVersion[]) ?? []),
      ]
    : [];

  try {
    await fileReference.save(Buffer.from(await file.arrayBuffer()), {
      resumable: false,
      metadata: { contentType: file.type || "application/octet-stream" },
    });

    const now = FieldValue.serverTimestamp();
    const reference = getFilesCollection().doc(fileId);
    await reference.set({
      type,
      name: file.name,
      url: `/api/files/${fileId}`,
      extension,
      size: file.size,
      owner: currentUser.$id,
      accountId: currentUser.accountId,
      bucketField: storagePath,
      users: [getUserSummary(currentUser)],
      folderId,
      inTrash: false,
      favorite: false,
      previousVersions,
      createdAt: now,
      updatedAt: now,
    });

    if (existingFile) {
      await existingFile.ref.delete();
    }

    const savedFile = await reference.get();
    return parseStringify(serializeFile(fileId, savedFile.data() ?? {}));
  } catch (error) {
    try {
      await fileReference.delete({ ignoreNotFound: true });
    } catch (cleanupError) {
      console.error("Failed to clean up Firebase Storage object:", cleanupError);
    }
    handleError(error, "Failed to upload file");
  }
};

export const uploadFile = async ({
  file,
  path,
  folderId = "root",
}: UploadFileProps) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in to upload files");

  const uploadedFile = await saveUploadedFile({ file, folderId, currentUser });

  revalidatePath(path);
  return uploadedFile;
};

export const getFiles = async ({
  types = [],
  searchText = "",
  sort = "$createdAt-desc",
  limit,
  folderId,
  includeTrashed = false,
}: GetFilesProps & { accountId?: string }) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in to view files");

  let query = getFilesCollection().where("accountId", "==", currentUser.accountId);
  if (types.length > 0) {
    query = query.where("type", "in", types);
  }

  const snapshot = await query.get();
  let documents = snapshot.docs.map((document) =>
    serializeFile(document.id, document.data()),
  );

  if (folderId) {
    documents = documents.filter((file) => file.folderId === folderId);
  }

  if (!includeTrashed) {
    documents = documents.filter((file) => !file.inTrash);
  }

  if (searchText.trim()) {
    const normalizedSearch = searchText.trim().toLowerCase();
    documents = documents.filter((file) =>
      file.name.toLowerCase().includes(normalizedSearch),
    );
  }

  const [sortBy, orderBy] = sort.split("-");
  documents.sort((left, right) => {
    const leftValue = left[sortBy as keyof FileRecord];
    const rightValue = right[sortBy as keyof FileRecord];

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return orderBy === "asc" ? leftValue - rightValue : rightValue - leftValue;
    }

    const comparison = String(leftValue).localeCompare(String(rightValue));
    return orderBy === "asc" ? comparison : -comparison;
  });

  if (limit) documents = documents.slice(0, limit);

  return { documents, total: documents.length };
};

export const renameFile = async ({
  fileId,
  name,
  extension,
  path,
}: RenameFileProps) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in to rename files");

  const reference = getFilesCollection().doc(fileId);
  const snapshot = await reference.get();
  if (!snapshot.exists || snapshot.data()?.accountId !== currentUser.accountId) {
    throw new Error("File not found or access denied");
  }

  await reference.update({
    name: extension ? `${name}.${extension}` : name,
    updatedAt: FieldValue.serverTimestamp(),
  });
  revalidatePath(path);
  return true;
};

export const restoreFileVersion = async ({
  fileId,
  versionIndex,
  path,
}: {
  fileId: string;
  versionIndex: number;
  path: string;
}) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in to restore versions");

  const reference = getFilesCollection().doc(fileId);
  const snapshot = await reference.get();
  const file = snapshot.exists ? snapshot.data() : undefined;
  if (!file || file.accountId !== currentUser.accountId) {
    throw new Error("File not found or access denied");
  }

  const versions = (file.previousVersions as FileVersion[]) ?? [];
  const version = versions[versionIndex];
  if (!version) throw new Error("Version not found");

  const currentVersion: FileVersion = {
    bucketField: String(file.bucketField ?? ""),
    size: Number(file.size ?? 0),
    $createdAt: toIsoString(file.updatedAt) || new Date().toISOString(),
  };

  const updatedVersions = versions.map((entry, index) =>
    index === versionIndex ? currentVersion : entry,
  );

  await reference.update({
    bucketField: version.bucketField,
    size: version.size,
    previousVersions: updatedVersions,
    updatedAt: FieldValue.serverTimestamp(),
  });

  revalidatePath(path);
  return { status: "success" };
};

export const updateFileUsers = async ({
  fileId,
  emails,
  path,
}: UpdateFileUsersProps) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in to share files");

  const reference = getFilesCollection().doc(fileId);
  const snapshot = await reference.get();
  const file = snapshot.exists ? snapshot.data() : undefined;
  if (!file || file.accountId !== currentUser.accountId) {
    throw new Error("File not found or access denied");
  }

  const sharedUsers = (
    await Promise.all(emails.map((email) => getUserByEmail(email)))
  ).filter((user): user is NonNullable<typeof user> => Boolean(user));
  const users = [
    getUserSummary(currentUser),
    ...sharedUsers
      .filter((user) => user.accountId !== currentUser.accountId)
      .map((user) => ({
        $id: user.$id,
        accountId: user.accountId,
        email: user.email,
        fullName: user.fullName,
      })),
  ];

  await reference.update({ users, updatedAt: FieldValue.serverTimestamp() });
  revalidatePath(path);
  return true;
};

export const deleteFile = async ({
  fileId,
  path,
}: DeleteFileProps) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in to delete files");

  const reference = getFilesCollection().doc(fileId);
  const snapshot = await reference.get();
  const file = snapshot.exists ? snapshot.data() : undefined;
  if (!file || file.accountId !== currentUser.accountId) {
    throw new Error("File not found or access denied");
  }

  await reference.update({
    inTrash: true,
    deletedAt: new Date().toISOString(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  revalidatePath(path);
  return true;
};

export const restoreFile = async ({ fileId, path }: { fileId: string; path: string }) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in to restore files");

  const reference = getFilesCollection().doc(fileId);
  const snapshot = await reference.get();
  const file = snapshot.exists ? snapshot.data() : undefined;
  if (!file || file.accountId !== currentUser.accountId) {
    throw new Error("File not found or access denied");
  }

  const targetFolder = String(file.folderId ?? "root");
  const folderStillExists =
    targetFolder === "root" ||
    Boolean(
      await getFirebaseAdmin().firestore
        .collection("folders")
        .doc(targetFolder)
        .get()
        .then((document) => document.exists),
    );

  await reference.update({
    inTrash: false,
    deletedAt: null,
    folderId: folderStillExists ? targetFolder : "root",
    updatedAt: FieldValue.serverTimestamp(),
  });

  revalidatePath(path);
  return true;
};

export const permanentlyDeleteFile = async ({
  fileId,
  bucketField,
  path,
}: DeleteFileProps) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in to delete files");

  const reference = getFilesCollection().doc(fileId);
  const snapshot = await reference.get();
  const file = snapshot.exists ? snapshot.data() : undefined;
  if (!file || file.accountId !== currentUser.accountId) {
    throw new Error("File not found or access denied");
  }

  const storagePath = String(file.bucketField ?? bucketField ?? "");
  if (storagePath) {
    await getStorageBucket().file(storagePath).delete({ ignoreNotFound: true });
  }

  await reference.delete();
  revalidatePath(path);
  return true;
};

export const toggleFavorite = async ({
  fileId,
  favorite,
  path,
}: {
  fileId: string;
  favorite: boolean;
  path: string;
}) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in to update files");

  const reference = getFilesCollection().doc(fileId);
  const snapshot = await reference.get();
  if (!snapshot.exists || snapshot.data()?.accountId !== currentUser.accountId) {
    throw new Error("File not found or access denied");
  }

  await reference.update({
    favorite,
    updatedAt: FieldValue.serverTimestamp(),
  });

  revalidatePath(path);
  return true;
};

export const deleteFilesBulk = async ({
  fileIds,
  path,
}: {
  fileIds: string[];
  path: string;
}) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in to delete files");

  if (fileIds.length === 0) return { status: "success", count: 0 };

  const { firestore } = getFirebaseAdmin();
  const batch = firestore.batch();
  const deletedAt = new Date().toISOString();

  const snapshots = await Promise.all(
    fileIds.map((fileId) => getFilesCollection().doc(fileId).get()),
  );

  let count = 0;
  snapshots.forEach((snapshot) => {
    if (!snapshot.exists) return;
    if (snapshot.data()?.accountId !== currentUser.accountId) return;

    batch.update(snapshot.ref, {
      inTrash: true,
      deletedAt,
      updatedAt: FieldValue.serverTimestamp(),
    });
    count++;
  });

  await batch.commit();
  revalidatePath(path);
  return { status: "success", count };
};

export const moveFilesBulk = async ({
  fileIds,
  folderId,
  path,
}: {
  fileIds: string[];
  folderId: string;
  path: string;
}) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in to move files");

  if (fileIds.length === 0) return { status: "success", count: 0 };

  if (folderId !== "root") {
    const folderDoc = await getFirebaseAdmin()
      .firestore.collection("folders")
      .doc(folderId)
      .get();

    if (!folderDoc.exists) throw new Error("Target folder no longer exists");
  }

  const { firestore } = getFirebaseAdmin();
  const batch = firestore.batch();

  const snapshots = await Promise.all(
    fileIds.map((fileId) => getFilesCollection().doc(fileId).get()),
  );

  let count = 0;
  snapshots.forEach((snapshot) => {
    if (!snapshot.exists) return;
    if (snapshot.data()?.accountId !== currentUser.accountId) return;

    batch.update(snapshot.ref, {
      folderId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    count++;
  });

  await batch.commit();
  revalidatePath(path);
  return { status: "success", count };
};

export const emptyTrash = async ({ path }: { path: string }) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in to empty trash");

  const snapshot = await getFilesCollection()
    .where("accountId", "==", currentUser.accountId)
    .where("inTrash", "==", true)
    .get();

  await Promise.all(
    snapshot.docs.map(async (document) => {
      const storagePath = String(document.data().bucketField ?? "");
      if (storagePath) {
        await getStorageBucket()
          .file(storagePath)
          .delete({ ignoreNotFound: true });
      }
      await document.ref.delete();
    }),
  );

  revalidatePath(path);
  return { status: "success" };
};

export const createShareLink = async ({
  fileId,
  permission = "view",
  expiresInDays,
  path,
}: {
  fileId: string;
  permission?: FileRecord["sharePermission"];
  expiresInDays?: number;
  path: string;
}) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in to share files");

  const reference = getFilesCollection().doc(fileId);
  const snapshot = await reference.get();
  const file = snapshot.exists ? snapshot.data() : undefined;
  if (!file || file.accountId !== currentUser.accountId) {
    throw new Error("File not found or access denied");
  }

  const shareId = randomUUID();
  const shareExpiry = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  await reference.update({
    shareId,
    sharePermission: permission ?? "view",
    shareExpiry,
    updatedAt: FieldValue.serverTimestamp(),
  });

  revalidatePath(path);
  return { shareId, shareExpiry };
};

export const revokeShareLink = async ({
  fileId,
  path,
}: {
  fileId: string;
  path: string;
}) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in to share files");

  const reference = getFilesCollection().doc(fileId);
  const snapshot = await reference.get();
  if (!snapshot.exists || snapshot.data()?.accountId !== currentUser.accountId) {
    throw new Error("File not found or access denied");
  }

  await reference.update({
    shareId: null,
    sharePermission: null,
    shareExpiry: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  revalidatePath(path);
  return true;
};

export const getFileByShareId = async (shareId: string) => {
  const snapshot = await getFilesCollection()
    .where("shareId", "==", shareId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const document = snapshot.docs[0];
  const file = serializeFile(document.id, document.data());

  if (file.inTrash) return null;
  if (file.shareExpiry && new Date(file.shareExpiry) < new Date()) return null;

  return file;
};

export const getTotalSpaceUsed = async (accountId: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.accountId !== accountId) {
      throw new Error("You must be signed in to view storage usage");
    }

    const files = await getFiles({ types: [], accountId });
    const totalSpace = {
      image: { size: 0, latestDate: "" },
      document: { size: 0, latestDate: "" },
      video: { size: 0, latestDate: "" },
      audio: { size: 0, latestDate: "" },
      other: { size: 0, latestDate: "" },
      used: 0,
      all: STORAGE_QUOTA_BYTES,
    };

    files.documents.forEach((file: FileRecord) => {
      totalSpace[file.type].size += file.size;
      totalSpace.used += file.size;
      if (
        !totalSpace[file.type].latestDate ||
        new Date(file.$updatedAt) > new Date(totalSpace[file.type].latestDate)
      ) {
        totalSpace[file.type].latestDate = file.$updatedAt;
      }
    });

    return parseStringify(totalSpace);
  } catch (error) {
    handleError(error, "Error calculating total space used");
  }
};
