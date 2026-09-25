import FileList from "@/components/FileList";
import { getFiles } from "@/lib/actions/file.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";

const StarredPage = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) return null;

  const files = await getFiles({
    types: [],
    accountId: currentUser.accountId,
  });

  const starredFiles = files.documents.filter((file) => file.favorite);

  return (
    <div className="dashboard-container">
      <div className="dashboard-recent-files">
        <h2 className="h3 xl:h2 text-light-100">Starred files</h2>

        {starredFiles.length > 0 ? (
          <div className="mt-5">
            <FileList
              files={starredFiles}
              emptyMessage="No starred files. Star files from the actions menu to find them quickly."
            />
          </div>
        ) : (
          <p className="empty-list mt-5">
            No starred files. Star files from the actions menu to find them
            quickly.
          </p>
        )}
      </div>
    </div>
  );
};

export default StarredPage;
