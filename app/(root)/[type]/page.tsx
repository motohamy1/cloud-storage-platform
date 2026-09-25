import FileList from "@/components/FileList";
import Sort from "@/components/Sort";
import { getFiles } from "@/lib/actions/file.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getFileTypesParams } from "@/lib/utils";

const Page = async ({
  params,
  searchParams,
}: SearchParamProps & { params: Promise<{ type: string }> }) => {
  const { type } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query =
    typeof resolvedSearchParams.query === "string"
      ? resolvedSearchParams.query
      : "";
  const sort =
    typeof resolvedSearchParams.sort === "string"
      ? resolvedSearchParams.sort
      : undefined;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="dashboard-container">
        <p className="text-light-100">Please sign in to view files.</p>
      </div>
    );
  }

  const files = await getFiles({
    types: getFileTypesParams(type),
    searchText: query,
    sort,
    accountId: currentUser.accountId,
  });

  return (
    <div className="dashboard-container">
      <div className="dashboard-recent-files">
        <div className="flex items-center justify-between gap-4">
          <h2 className="h3 xl:h2 text-light-100 capitalize">
            {type === "others" ? "Others" : type}
          </h2>
          <Sort />
        </div>
        {files.documents.length > 0 ? (
          <div className="mt-5">
            <FileList
              files={files.documents}
              emptyMessage={`No ${type} found`}
            />
          </div>
        ) : (
          <p className="empty-list">No {type} found</p>
        )}
      </div>
    </div>
  );
};

export default Page;