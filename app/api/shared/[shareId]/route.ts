import { getFileByShareId } from "@/lib/actions/file.actions";
import { getFirebaseAdmin } from "@/lib/firebase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> },
) => {
  const { shareId } = await params;
  const file = await getFileByShareId(shareId);

  if (!file || !file.bucketField) {
    return NextResponse.json(
      { error: "This link is invalid or has expired" },
      { status: 404 },
    );
  }

  try {
    const { storage } = getFirebaseAdmin();
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
    const object = bucket.file(file.bucketField);

    const [downloadResult, metadataResponse] = await Promise.all([
      object.download(),
      object.getMetadata(),
    ]);
    const [contents] = downloadResult;
    const [fileMetadata] = metadataResponse;

    const contentDisposition = request.nextUrl.searchParams.has("download")
      ? `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`
      : "inline";

    return new NextResponse(new Uint8Array(contents), {
      headers: {
        "Content-Type":
          fileMetadata?.contentType ?? "application/octet-stream",
        "Content-Length": String(contents.length),
        "Content-Disposition": contentDisposition,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Failed to serve shared Firebase file:", error);
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }
};
