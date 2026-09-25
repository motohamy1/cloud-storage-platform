"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { sendPasswordResetEmail } from "@/lib/actions/user.actions";

const resetSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSent, setIsSent] = useState(false);

  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof resetSchema>) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      await sendPasswordResetEmail(values.email);
      setIsSent(true);
    } catch (error) {
      console.error("Password reset error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to send reset email. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Image
            src="/assets/icons/check-green.svg"
            alt="sent"
            width={56}
            height={56}
          />
          <h1 className="form-title">Check your inbox</h1>
          <p className="body-2 text-light-200">
            If an account exists for that email, we&apos;ve sent a link to reset
            your password. The link expires shortly, so use it soon.
          </p>
        </div>

        <Link href="/sign-in" className="form-submit-button">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="auth-form">
        <h1 className="form-title">Reset your password</h1>
        <p className="body-2 text-light-200">
          Enter your account email and we&apos;ll send you a link to set a new
          password.
        </p>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <div className="shad-form-item">
                <FormLabel className="shad-form-label">Email</FormLabel>

                <FormControl>
                  <Input
                    placeholder="Enter your email"
                    className="shad-input"
                    {...field}
                  />
                </FormControl>
              </div>

              <FormMessage className="shad-form-message" />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="form-submit-button"
          disabled={isLoading}
        >
          Send reset link

          {isLoading && (
            <Image
              src="/assets/icons/loader.svg"
              alt="loader"
              width={24}
              height={24}
              className="ml-2 animate-spin"
            />
          )}
        </Button>

        {errorMessage && <p className="error-message">*{errorMessage}</p>}

        <div className="body-2 flex justify-center">
          <Link href="/sign-in" className="font-medium text-brand">
            Back to sign in
          </Link>
        </div>
      </form>
    </Form>
  );
};

export default ResetPasswordForm;
