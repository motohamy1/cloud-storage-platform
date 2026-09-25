"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { FormattedDateTime } from "@/components/FormattedDateTime";
import { Thumbnail } from "@/components/Thumbnail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchFilesNaturally } from "@/lib/actions/ai.actions";
import { convertFileSize } from "@/lib/utils";

interface SearchResult {
  results: FileRecord[];
  parsed: {
    types: string[];
    nameContains: string;
    fromDaysAgo?: number;
    minSizeMB?: number;
  };
  source: "ai" | "rules";
}

const SUGGESTIONS = [
  "images from last week",
  "pdf documents over 10MB",
  "videos from this year",
  "invoices",
];

const AISearch = () => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<SearchResult | null>(null);

  const runSearch = async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await searchFilesNaturally({ query: trimmed });
      setData(result);
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Search failed. Please try again.",
      );
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const describeParsed = () => {
    if (!data) return null;

    const parts: string[] = [];

    if (data.parsed.types.length > 0) {
      parts.push(data.parsed.types.join(", "));
    }
    if (data.parsed.nameContains) {
      parts.push(`name contains "${data.parsed.nameContains}"`);
    }
    if (data.parsed.fromDaysAgo) {
      parts.push(`uploaded in the last ${data.parsed.fromDaysAgo} days`);
    }
    if (data.parsed.minSizeMB) {
      parts.push(`larger than ${data.parsed.minSizeMB}MB`);
    }

    if (parts.length === 0) return "All files";

    return parts.join(" · ");
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-recent-files">
        <h2 className="h3 xl:h2 text-light-100">AI search</h2>
        <p className="body-2 mt-1 text-light-200">
          Search in plain language — &ldquo;images from last week&rdquo;,
          &ldquo;pdf over 10MB&rdquo;.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Input
            value={query}
            placeholder="Describe what you're looking for..."
            className="search-input max-w-xl"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") runSearch(query);
            }}
          />
          <Button
            onClick={() => runSearch(query)}
            disabled={isLoading || !query.trim()}
            className="uploader-button"
          >
            Search
            {isLoading && (
              <Image
                src="/assets/icons/loader.svg"
                alt="loader"
                width={24}
                height={24}
                className="animate-spin"
              />
            )}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setQuery(suggestion);
                runSearch(suggestion);
              }}
              className="caption rounded-full bg-light-400 px-3 py-1 text-light-100 transition-colors hover:bg-light-300"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {error && <p className="error-message mt-4">*{error}</p>}

        {data && (
          <>
            <p className="caption mt-5 text-light-200">
              {data.results.length} result
              {data.results.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo; ·{" "}
              {describeParsed()} ·{" "}
              {data.source === "ai"
                ? "interpreted by AI"
                : "interpreted locally (configure AI_API_KEY for smarter results)"}
            </p>

            <ul className="mt-4 flex flex-col gap-5">
              {data.results.map((file) => (
                <li className="flex items-center gap-3" key={file.$id}>
                  <Link
                    href={`/api/files/${file.$id}`}
                    target="_blank"
                    className="flex flex-1 items-center gap-3"
                  >
                    <Thumbnail
                      type={file.type}
                      extension={file.extension}
                      url={file.url}
                    />
                    <div className="flex flex-col gap-1">
                      <p className="recent-file-name">{file.name}</p>
                      <p className="caption text-light-200">
                        {convertFileSize(file.size)} ·{" "}
                        <FormattedDateTime date={file.$createdAt} />
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {data.results.length === 0 && (
              <p className="empty-list mt-4">No matching files</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AISearch;
