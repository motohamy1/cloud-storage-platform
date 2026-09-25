import { FormattedDateTime } from "@/components/FormattedDateTime";
import { Thumbnail } from "@/components/Thumbnail";
import EmptyTrashButton from "@/components/EmptyTrashButton";
import TrashFileActions from "@/components/TrashFileActions";
import { getFiles } from "@/lib/actions/file.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";

const TrashPage = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) return null;

  const files = await getFiles({
    types: [],
    accountId: currentUser.accountId,
    includeTrashed: true,
  });

  const trashedFiles = files.documents
    .filter((file) => file.inTrash)
    .sort(
      (left, right) =>
        new Date(right.deletedAt ?? 0).getTime() -
        new Date(left.deletedAt ?? 0).getTime(),
    );

  return (
    <div className="dashboard-container">
      <div className="dashboard-recent-files">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="h3 xl:h2 text-light-100">Trash</h2>
          {trashedFiles.length > 0 && <EmptyTrashButton />}
        </div>

        <p className="body-2 mt-2 text-light-200">
          Items in Trash are deleted forever after 30 days.
        </p>

        {trashedFiles.length > 0 ? (
          <ul className="mt-5 flex flex-col gap-5">
            {trashedFiles.map((file) => (
              <li className="flex items-center gap-3" key={file.$id}>
                <Thumbnail
                  type={file.type}
                  extension={file.extension}
                  url={file.url}
                />

                <div className="recent-file-details">
                  <div className="flex flex-col gap-1">
                    <p className="recent-file-name">{file.name}</p>
                    <FormattedDateTime
                      date={file.deletedAt ?? file.$createdAt}
                      className="caption"
                    />
                  </div>
                </div>

                <TrashFileActions file={file} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-list mt-5">Trash is empty</p>
        )}
      </div>
    </div>
  );
};

export default TrashPage;
