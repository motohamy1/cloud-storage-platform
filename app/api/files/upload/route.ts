import { NextRequest, NextResponse } from "next/server";

import { MAX_FILE_SIZE } from "@/constants";
import { saveUploadedFile } from "@/lib/actions/file.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";

export const dynamic = "force-dynamic";

export const POST = async (request: NextRequest) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid upload payload" },
      { status: 400 },
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        error: `File is too large. Max file size is ${Math.floor(
          MAX_FILE_SIZE / (1024 * 1024),
        )}MB.`,
      },
      { status: 413 },
    );
  }

  const folderId = formData.get("folderId")?.toString() || "root";

  try {
    const uploadedFile = await saveUploadedFile({
      file,
      folderId,
      currentUser,
    });

    return NextResponse.json(uploadedFile);
  } catch (error) {
    console.error("Upload failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload file";

    const status = message.includes("quota") ? 403 : 500;

    return NextResponse.json({ error: message }, { status });
  }
};
