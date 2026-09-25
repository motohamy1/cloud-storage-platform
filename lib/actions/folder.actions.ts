"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

import { getFirebaseAdmin } from "@/lib/firebase";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { parseStringify } from "@/lib/utils";

function handleError(error: unknown, message: string): never {
  console.error(message, error);
  throw new Error(message);
}

const requireCurrentUser = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in");
  return currentUser;
};

const ROOT_FOLDER = "root";

const getFoldersCollection = () =>
  getFirebaseAdmin().firestore.collection("folders");

const getFilesCollection = () =>
  getFirebaseAdmin().firestore.collection("files");

const serializeFolder = (id: string, data: Record<string, unknown>): Folder => ({
  $id: id,
  name: String(data.name ?? ""),
  parentId: String(data.parentId ?? ROOT_FOLDER),
  accountId: String(data.accountId ?? ""),
  $createdAt:
    (data.createdAt as { toDate?: () => Date })?.toDate?.().toISOString() ?? "",
  $updatedAt:
    (data.updatedAt as { toDate?: () => Date })?.toDate?.().toISOString() ?? "",
});

export const getFolders = async ({
  accountId,
  parentId = ROOT_FOLDER,
}: {
  accountId: string;
  parentId?: string;
}): Promise<Folder[]> => {
  try {
    const snapshot = await getFoldersCollection()
      .where("accountId", "==", accountId)
      .where("parentId", "==", parentId)
      .get();

    const folders = snapshot.docs.map((document) =>
      serializeFolder(document.id, document.data()),
    );

    return parseStringify(
      folders.sort((left, right) => left.name.localeCompare(right.name)),
    ) as Folder[];
  } catch (error) {
    handleError(error, "Failed to get folders");
  }
};

export const createFolder = async ({
  name,
  parentId = ROOT_FOLDER,
  path,
}: {
  name: string;
  parentId?: string;
  accountId?: string;
  path: string;
}) => {
  try {
    const currentUser = await requireCurrentUser();

    if (parentId !== ROOT_FOLDER && !(await folderExists(parentId))) {
      throw new Error("Parent folder no longer exists");
    }

    const reference = getFoldersCollection().doc();
    const timestamp = FieldValue.serverTimestamp();

    await reference.set({
      name,
      parentId,
      accountId: currentUser.accountId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    revalidatePath(path);
    return parseStringify(
      serializeFolder(reference.id, {
        name,
        parentId,
        accountId: currentUser.accountId,
      }),
    ) as Folder;
  } catch (error) {
    handleError(error, "Failed to create folder");
  }
};

const getOwnedFolder = async (folderId: string) => {
  const currentUser = await requireCurrentUser();
  const folder = await getFolderById(folderId);

  if (!folder || folder.accountId !== currentUser.accountId) {
    throw new Error("Folder not found or access denied");
  }

  return folder;
};

export const renameFolder = async ({
  folderId,
  name,
  path,
}: {
  folderId: string;
  name: string;
  path: string;
}) => {
  try {
    await getOwnedFolder(folderId);

    await getFoldersCollection().doc(folderId).update({
      name,
      updatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath(path);
    return { status: "success" };
  } catch (error) {
    handleError(error, "Failed to rename folder");
  }
};

export const getFolderById = async (folderId: string) => {
  try {
    const document = await getFoldersCollection().doc(folderId).get();

    if (!document.exists) return null;

    return parseStringify(
      serializeFolder(document.id, document.data() ?? {}),
    ) as Folder;
  } catch {
    return null;
  }
};

export const folderExists = async (folderId: string) => {
  return Boolean(await getFolderById(folderId));
};

const collectDescendantFolderIds = async (
  folderId: string,
): Promise<string[]> => {
  const snapshot = await getFoldersCollection()
    .where("parentId", "==", folderId)
    .get();

  const ids = [folderId];

  for (const document of snapshot.docs) {
    ids.push(...(await collectDescendantFolderIds(document.id)));
  }

  return ids;
};

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

// Soft-deletes every file in the folder tree, then removes the folder docs.
// Trashed files can be restored individually (they return to root).
export const deleteFolder = async ({
  folderId,
  path,
}: {
  folderId: string;
  path: string;
}) => {
  try {
    const currentUser = await requireCurrentUser();
    const folder = await getFolderById(folderId);

    if (!folder || folder.accountId !== currentUser.accountId) {
      throw new Error("Folder not found or access denied");
    }

    const { firestore } = getFirebaseAdmin();
    const folderIds = await collectDescendantFolderIds(folderId);

    const filesSnapshots = await Promise.all(
      chunkArray(folderIds, 10).map((chunk) =>
        getFilesCollection()
          .where("accountId", "==", currentUser.accountId)
          .where("folderId", "in", chunk)
          .get(),
      ),
    );

    const batch = firestore.batch();
    const deletedAt = new Date().toISOString();

    filesSnapshots.forEach((filesSnapshot) => {
      filesSnapshot.docs.forEach((document) => {
        const data = document.data();
        if (data.inTrash === true) return;

        batch.update(document.ref, {
          inTrash: true,
          deletedAt,
          folderId: "",
        });
      });
    });

    folderIds.forEach((id) => {
      batch.delete(getFoldersCollection().doc(id));
    });

    await batch.commit();

    revalidatePath(path);
    return { status: "success" };
  } catch (error) {
    handleError(error, "Failed to delete folder");
  }
};

export const moveFileToFolder = async ({
  fileId,
  folderId,
  path,
}: {
  fileId: string;
  folderId: string;
  path: string;
}) => {
  try {
    const currentUser = await requireCurrentUser();

    if (folderId !== ROOT_FOLDER && !(await folderExists(folderId))) {
      throw new Error("Target folder no longer exists");
    }

    const reference = getFilesCollection().doc(fileId);
    const snapshot = await reference.get();
    if (
      !snapshot.exists ||
      snapshot.data()?.accountId !== currentUser.accountId
    ) {
      throw new Error("File not found or access denied");
    }

    await reference.update({
      folderId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath(path);
    return { status: "success" };
  } catch (error) {
    handleError(error, "Failed to move file");
  }
};

export const getBreadcrumbTrail = async (folderId: string) => {
  const trail: { $id: string; name: string }[] = [];

  let currentId = folderId;

  while (currentId && currentId !== ROOT_FOLDER) {
    const folder = await getFolderById(currentId);
    if (!folder) break;
    trail.unshift({ $id: folder.$id, name: folder.name });
    currentId = folder.parentId;
  }

  return trail;
};
