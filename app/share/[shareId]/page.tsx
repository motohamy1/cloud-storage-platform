import Image from "next/image";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import Thumbnail from "@/components/Thumbnail";
import { getFileByShareId } from "@/lib/actions/file.actions";
import { convertFileSize, formatDateTime } from "@/lib/utils";

const SharePage = async ({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) => {
  const { shareId } = await params;
  const file = await getFileByShareId(shareId);

  if (!file) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6">
      <Image
        src="/assets/icons/logo-full-brand.svg"
        alt="logo"
        width={180}
        height={50}
      />

      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-[20px] border border-light-300 bg-background p-8 shadow-drop-1">
        <Thumbnail
          type={file.type}
          extension={file.extension}
          url={`/api/shared/${shareId}`}
          className="!size-28"
          imageClassName="!size-16"
        />

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="h3 text-light-100">{file.name}</h1>
          <p className="body-2 text-light-200">
            {convertFileSize(file.size)} ·{" "}
            {file.extension.toUpperCase() || "File"}
          </p>
          <p className="caption text-light-200">
            Shared on {formatDateTime(file.$createdAt)}
          </p>
        </div>

        <div className="flex w-full gap-3">
          <Button asChild className="uploader-button flex-1">
            <a href={`/api/shared/${shareId}`} target="_blank" rel="noreferrer">
              Open
            </a>
          </Button>
          <Button asChild className="uploader-button flex-1">
            <a href={`/api/shared/${shareId}?download=1`}>
              Download
            </a>
          </Button>
        </div>

        <p className="caption text-light-200">
          Shared securely via BasketStar
        </p>
      </div>
    </main>
  );
};

export default SharePage;
