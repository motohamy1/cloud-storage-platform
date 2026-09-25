"use client";

import { useState } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { resendVerificationEmail } from "@/lib/actions/user.actions";

const VerifyEmailBanner = ({ email }: { email: string }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleResend = async () => {
    setIsLoading(true);
    setStatus("idle");
    setMessage("");

    try {
      await resendVerificationEmail();
      setStatus("sent");
      setMessage(`Verification link sent to ${email}`);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Failed to send email",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-light-300 bg-brand/5 px-5 py-3">
      <div className="flex items-center gap-3">
        <Image
          src="/assets/icons/info.svg"
          alt="info"
          width={24}
          height={24}
        />
        <p className="body-2 text-light-100">
          Verify your email address to secure your account and enable sharing.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {message && (
          <p
            className={`caption ${
              status === "error" ? "text-red" : "text-green"
            }`}
          >
            {message}
          </p>
        )}
        <Button
          onClick={handleResend}
          disabled={isLoading}
          className="uploader-button h-9 px-4"
        >
          Resend email
          {isLoading && (
            <Image
              src="/assets/icons/loader.svg"
              alt="loader"
              width={16}
              height={16}
              className="animate-spin"
            />
          )}
        </Button>
      </div>
    </div>
  );
};

export default VerifyEmailBanner;
