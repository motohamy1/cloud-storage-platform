import FileList from "@/components/FileList";
import Breadcrumb from "@/components/Breadcrumb";
import Sort from "@/components/Sort";
import CreateFolderDialog from "@/components/CreateFolderDialog";
import FolderCard from "@/components/FolderCard";
import FileUploader from "@/components/FileUploader";
import { getFiles } from "@/lib/actions/file.actions";
import { getFolders } from "@/lib/actions/folder.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";

const FoldersPage = async ({ searchParams }: SearchParamProps) => {
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

  const [folders, files] = await Promise.all([
    getFolders({ accountId: currentUser.accountId, parentId: "root" }),
    getFiles({
      types: [],
      searchText: query,
      sort,
      folderId: "root",
      accountId: currentUser.accountId,
    }),
  ]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-recent-files">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Breadcrumb trail={[]} />
          <div className="flex flex-wrap items-center gap-3">
            <Sort />
            <CreateFolderDialog />
            <FileUploader
              ownerId={currentUser.$id}
              accountId={currentUser.accountId}
            />
          </div>
        </div>

        {(folders ?? []).length > 0 && (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {(folders ?? []).map((folder) => (
              <li key={folder.$id}>
                <FolderCard folder={folder} />
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

export default FoldersPage;
