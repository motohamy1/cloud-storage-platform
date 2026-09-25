import { getCurrentUser } from "@/lib/actions/user.actions";
import { getFirebaseAdmin } from "@/lib/firebase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { firestore, storage } = getFirebaseAdmin();
  const document = await firestore.collection("files").doc(id).get();

  if (!document.exists) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const file = document.data() ?? {};
  if (file.inTrash === true) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const users = Array.isArray(file.users) ? file.users : [];
  const canAccess =
    file.accountId === currentUser.accountId ||
    users.some(
      (user) =>
        typeof user === "object" &&
        user !== null &&
        "accountId" in user &&
        user.accountId === currentUser.accountId,
    );

  if (!canAccess || typeof file.bucketField !== "string") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
    const object = bucket.file(file.bucketField);
    const [downloadResult, metadataResponse] = await Promise.all([
      object.download(),
      object.getMetadata(),
    ]);
    const [contents] = downloadResult;
    const [fileMetadata] = metadataResponse;
    const filename = typeof file.name === "string" ? file.name : id;
    const contentDisposition = request.nextUrl.searchParams.has("download")
      ? `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
      : "inline";

    return new NextResponse(new Uint8Array(contents).buffer as ArrayBuffer, {
      headers: {
        "Content-Type":
          fileMetadata?.contentType ?? "application/octet-stream",
        "Content-Length": String(contents.length),
        "Content-Disposition": contentDisposition,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Failed to serve Firebase file:", error);
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }
};
