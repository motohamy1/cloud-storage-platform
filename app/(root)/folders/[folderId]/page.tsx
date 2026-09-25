import { notFound } from "next/navigation";

import Breadcrumb from "@/components/Breadcrumb";
import FileList from "@/components/FileList";
import Sort from "@/components/Sort";
import CreateFolderDialog from "@/components/CreateFolderDialog";
import FolderCard from "@/components/FolderCard";
import FileUploader from "@/components/FileUploader";
import { getFiles } from "@/lib/actions/file.actions";
import {
  getBreadcrumbTrail,
  getFolderById,
  getFolders,
} from "@/lib/actions/folder.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";

const FolderPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ folderId: string }>;
  searchParams?: SearchParamProps["searchParams"];
}) => {
  const { folderId } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) return null;

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query =
    typeof resolvedSearchParams.query === "string"
      ? resolvedSearchParams.query
      : "";
  const sort =
    typeof resolvedSearchParams.sort === "string"
      ? resolvedSearchParams.sort
      : undefined;

  const folder = await getFolderById(folderId);

  if (!folder || folder.accountId !== currentUser.accountId) {
    notFound();
  }

  const [childFolders, files, trail] = await Promise.all([
    getFolders({ accountId: currentUser.accountId, parentId: folderId }),
    getFiles({
      types: [],
      searchText: query,
      sort,
      folderId,
      accountId: currentUser.accountId,
    }),
    getBreadcrumbTrail(folderId),
  ]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-recent-files">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Breadcrumb trail={trail} />
          <div className="flex flex-wrap items-center gap-3">
            <Sort />
            <CreateFolderDialog parentId={folderId} />
            <FileUploader
              ownerId={currentUser.$id}
              accountId={currentUser.accountId}
              folderId={folderId}
            />
          </div>
        </div>

        {(childFolders ?? []).length > 0 && (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {(childFolders ?? []).map((childFolder) => (
              <li key={childFolder.$id}>
                <FolderCard folder={childFolder} />
              </li>
            ))}
          </ul>
        )}

        <h2 className="h4 mt-8 text-light-100">Files</h2>
        {files.documents.length > 0 ? (
          <div className="mt-5">
            <FileList
              files={files.documents}
              emptyMessage="No files in this folder"
            />
          </div>
        ) : (
          <p className="empty-list mt-5">No files in this folder</p>
        )}
      </div>
    </div>
  );
};

export default FolderPage;
