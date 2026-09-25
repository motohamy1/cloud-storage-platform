"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

const Error = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="h1 text-brand">Something went wrong</h1>

      <p className="body-2 text-light-200">
        We couldn&apos;t load this page. Please try again — if the problem
        persists, contact support.
      </p>

      <Button onClick={reset} className="uploader-button">
        Try again
      </Button>
    </div>
  );
};

export default Error;
