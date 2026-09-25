import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <Image
        src="/assets/icons/logo-full-brand.svg"
        alt="logo"
        width={180}
        height={50}
      />

      <h1 className="h1 text-brand">404</h1>

      <p className="body-2 text-light-200">
        The page you are looking for could not be found. It may have been moved
        or deleted.
      </p>

      <Button asChild className="uploader-button">
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
};

export default NotFound;
