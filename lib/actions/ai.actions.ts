"use server";

import { getFirebaseAdmin } from "@/lib/firebase";
import { AINotConfiguredError, complete } from "@/lib/ai";
import { isAIConfigured } from "@/lib/ai/config";
import { getFiles } from "@/lib/actions/file.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getFileType } from "@/lib/utils";

interface ParsedQuery {
  types: string[];
  nameContains: string;
  fromDaysAgo?: number;
  minSizeMB?: number;
}

const SUMMARIZABLE_EXTENSIONS = ["txt", "md", "csv", "json", "log", "html"];

const parseWithRules = (query: string): ParsedQuery => {
  const normalized = query.toLowerCase();
  const types: string[] = [];

  if (/\b(image|images|photo|photos|picture|pictures)\b/.test(normalized))
    types.push("image");
  if (/\b(video|videos|movie|movies|clip|clips)\b/.test(normalized))
    types.push("video");
  if (/\b(audio|music|song|songs|podcast)\b/.test(normalized))
    types.push("audio");
  if (/\b(doc|docs|document|documents|pdf|sheet|spreadsheet)\b/.test(normalized))
    types.push("document");

  const daysMatch = normalized.match(
    /\b(?:last|past)\s+(\d+)\s+(day|days|week|weeks|month|months|year|years)\b/,
  );
  let fromDaysAgo: number | undefined;

  if (daysMatch) {
    const amount = Number(daysMatch[1]);
    const unit = daysMatch[2];

    const multiplier =
      unit.startsWith("week")
        ? 7
        : unit.startsWith("month")
          ? 30
          : unit.startsWith("year")
            ? 365
            : 1;

    fromDaysAgo = amount * multiplier;
  } else if (/\b(this year)\b/.test(normalized)) {
    fromDaysAgo = 365;
  }

  const sizeMatch = normalized.match(
    /\b(?:over|larger than|bigger than|more than)\s+(\d+(?:\.\d+)?)\s*(mb|gb)\b/,
  );
  const minSizeMB = sizeMatch
    ? Number(sizeMatch[1]) * (sizeMatch[2] === "gb" ? 1024 : 1)
    : undefined;

  return { types, nameContains: "", fromDaysAgo, minSizeMB };
};

const parseWithAI = async (query: string): Promise<ParsedQuery> => {
  const content = await complete(
    [
      {
        role: "system",
        content:
          "You convert natural language file search requests into JSON filters. " +
          'Respond with JSON only: {"types": string[], "nameContains": string, "fromDaysAgo": number|null, "minSizeMB": number|null}. ' +
          'types is from ["document","image","video","audio","other"] (empty array means any). ' +
          "fromDaysAgo/null and minSizeMB/null are numbers or null. nameContains is a filename substring (empty string if none).",
      },
      { role: "user", content: query },
    ],
    { json: true, temperature: 0 },
  );

  const parsed = JSON.parse(content) as Partial<ParsedQuery>;

  return {
    types: Array.isArray(parsed.types)
      ? parsed.types.filter((type) =>
          ["document", "image", "video", "audio", "other"].includes(type),
        )
      : [],
    nameContains: parsed.nameContains ?? "",
    fromDaysAgo: parsed.fromDaysAgo ?? undefined,
    minSizeMB: parsed.minSizeMB ?? undefined,
  };
};

export const searchFilesNaturally = async ({ query }: { query: string }) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in to search");

  let parsed: ParsedQuery;
  let source: "ai" | "rules" = "rules";

  if (isAIConfigured()) {
    try {
      parsed = await parseWithAI(query);
      source = "ai";
    } catch (error) {
      console.error("AI search parsing failed, falling back to rules:", error);
      parsed = parseWithRules(query);
    }
  } else {
    parsed = parseWithRules(query);
  }

  const { documents } = await getFiles({
    types: parsed.types,
    accountId: currentUser.accountId,
  });

  const now = Date.now();
  const nameContains = parsed.nameContains.toLowerCase();

  const results = documents.filter((file) => {
    if (nameContains && !file.name.toLowerCase().includes(nameContains)) {
      return false;
    }

    if (
      parsed.fromDaysAgo &&
      new Date(file.$createdAt).getTime() <
        now - parsed.fromDaysAgo * 24 * 60 * 60 * 1000
    ) {
      return false;
    }

    if (parsed.minSizeMB && file.size < parsed.minSizeMB * 1024 * 1024) {
      return false;
    }

    return true;
  });

  return { results, parsed, source };
};

export const summarizeFile = async ({ fileId }: { fileId: string }) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in");

  const { firestore, storage } = getFirebaseAdmin();
  const document = await firestore.collection("files").doc(fileId).get();

  if (!document.exists) throw new Error("File not found");

  const file = document.data();
  if (file?.accountId !== currentUser.accountId) {
    throw new Error("File not found or access denied");
  }

  const { extension } = getFileType(String(file.name ?? ""));

  if (!SUMMARIZABLE_EXTENSIONS.includes(extension)) {
    throw new Error(
      `Summarizing .${extension || "unknown"} files is not supported yet. Supported: ${SUMMARIZABLE_EXTENSIONS.join(", ")}.`,
    );
  }

  if (!isAIConfigured()) throw new AINotConfiguredError();

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
  const [downloadResult] = await bucket
    .file(String(file.bucketField))
    .download();

  const text = downloadResult.toString("utf8").slice(0, 20000);

  const summary = await complete(
    [
      {
        role: "system",
        content:
          "Summarize the following file content in at most 5 bullet points. Be factual and concise.",
      },
      { role: "user", content: text },
    ],
    { temperature: 0.3 },
  );

  return { summary };
};

export const suggestFolderOrganization = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in");

  const { documents } = await getFiles({
    types: [],
    accountId: currentUser.accountId,
  });

  if (documents.length === 0) {
    return { suggestions: [] };
  }

  const fileList = documents
    .slice(0, 200)
    .map((file) => `${file.name} (${file.type}, ${file.size} bytes)`)
    .join("\n");

  const content = await complete(
    [
      {
        role: "system",
        content:
          "You suggest a folder structure for a user's files. " +
          'Respond with JSON only: {"suggestions": [{"folderName": string, "fileNames": string[]}]}. ' +
          "Use at most 6 folders with clear names. Each file appears in at most one folder.",
      },
      { role: "user", content: fileList },
    ],
    { json: true, temperature: 0.3 },
  );

  const parsed = JSON.parse(content) as {
    suggestions?: { folderName: string; fileNames: string[] }[];
  };

  return { suggestions: parsed.suggestions ?? [] };
};
