import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculatePercentage,
  convertFileSize,
  getFileType,
  getFileTypesParams,
  getUsageSummary,
} from "../lib/utils.ts";

test("convertFileSize formats each unit correctly", () => {
  assert.equal(convertFileSize(512), "512 Bytes");
  assert.equal(convertFileSize(2048), "2.0 KB");
  assert.equal(convertFileSize(1024 * 1024 * 3), "3.0 MB");
  assert.equal(convertFileSize(1024 * 1024 * 1024 * 2), "2.0 GB");
});

test("getFileType classifies extensions and reports the extension", () => {
  assert.deepEqual(getFileType("report.PDF"), {
    type: "document",
    extension: "pdf",
  });
  assert.deepEqual(getFileType("photo.jpeg"), {
    type: "image",
    extension: "jpeg",
  });
  assert.deepEqual(getFileType("clip.mp4"), { type: "video", extension: "mp4" });
  assert.deepEqual(getFileType("song.flac"), {
    type: "audio",
    extension: "flac",
  });
  assert.deepEqual(getFileType("archive.zip"), { type: "other", extension: "zip" });
  assert.deepEqual(getFileType("noextension"), { type: "other", extension: "" });
});

test("calculatePercentage rounds to two decimals", () => {
  assert.equal(calculatePercentage(1024 * 1024 * 1024), 50);
  assert.equal(calculatePercentage(0), 0);
});

test("getFileTypesParams maps route types to appwrite types", () => {
  assert.deepEqual(getFileTypesParams("documents"), ["document"]);
  assert.deepEqual(getFileTypesParams("images"), ["image"]);
  assert.deepEqual(getFileTypesParams("media"), ["video", "audio"]);
  assert.deepEqual(getFileTypesParams("others"), ["other"]);
});

test("getUsageSummary combines video and audio into media", () => {
  const summary = getUsageSummary({
    document: { size: 100, latestDate: "2026-01-01T00:00:00.000Z" },
    image: { size: 200, latestDate: "2026-01-02T00:00:00.000Z" },
    video: { size: 300, latestDate: "2026-01-03T00:00:00.000Z" },
    audio: { size: 50, latestDate: "2026-01-04T00:00:00.000Z" },
    other: { size: 0, latestDate: "" },
  });

  const media = summary.find((entry) => entry.title === "Media");
  assert.equal(media?.size, 350);
  assert.equal(media?.latestDate, "2026-01-04T00:00:00.000Z");
});
