"use server";

import { redirect } from "next/navigation";
import { getFirebaseAdmin } from "@/lib/firebase";
import {
  clearSessionCookie,
  createUserProfile,
  getSessionUser,
  getUserByEmail,
  getUserIdToken,
  setSessionCookie,
} from "@/lib/firebase/auth";
import { avatarPlaceholderUrl } from "@/constants";
import { sendVerificationEmail } from "@/lib/resend";

export { getUserByEmail };

const handleError = (error: unknown, message: string) => {
  console.error(message, error);
  throw new Error(message);
};

export const signUp = async ({
  fullName,
  email,
  password,
}: {
  fullName: string;
  email: string;
  password: string;
}) => {
  const { auth } = getFirebaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();
  let uid: string | undefined;

  try {
    const user = await auth.createUser({
      email: normalizedEmail,
      password,
      displayName: fullName.trim(),
    });
    uid = user.uid;

    try {
      await createUserProfile({
        uid,
        fullName: fullName.trim(),
        email: normalizedEmail,
        avatar: avatarPlaceholderUrl,
      });
    } catch (error) {
      await auth.deleteUser(uid);
      throw error;
    }

    const idToken = await getUserIdToken(normalizedEmail, password);
    await setSessionCookie(idToken);

    if (process.env.RESEND_API_KEY) {
      try {
        await sendVerificationEmail(normalizedEmail);
      } catch (error) {
        console.error("Failed to send verification email:", error);
      }
    }
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    if (firebaseError.code === "auth/email-already-exists") {
      throw new Error("An account with this email already exists. Please sign in.");
    }
    handleError(error, "Failed to sign up");
  }

  redirect("/");
};

export const signIn = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  try {
    const idToken = await getUserIdToken(email, password);
    await setSessionCookie(idToken);
  } catch (error) {
    handleError(error, "Invalid email or password. Please check your credentials.");
  }

  redirect("/");
};

export const sendPasswordResetEmail = async (email: string) => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not configured");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestType: "PASSWORD_RESET",
        email: email.trim().toLowerCase(),
        returnOobInfo: true,
      }),
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as {
    error?: { message?: string };
  };

  if (!response.ok) {
    const message = payload.error?.message ?? "";

    // Treat unknown emails as success to avoid leaking account existence
    if (message === "EMAIL_NOT_FOUND") {
      return { status: "success" };
    }
    if (message === "INVALID_EMAIL") {
      throw new Error("Please enter a valid email address.");
    }
    throw new Error("Unable to send reset email. Please try again later.");
  }

  return { status: "success" };
};

export const resendVerificationEmail = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in");

  try {
    await sendVerificationEmail(currentUser.email);
    return { status: "sent" };
  } catch (error) {
    if (error instanceof Error && error.message.includes("RESEND_API_KEY")) {
      throw new Error(
        "Email sending is not configured yet. Add RESEND_API_KEY to enable verification emails.",
      );
    }
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    return await getSessionUser();
  } catch (error) {
    console.error("Failed to resolve current user:", error);
    return null;
  }
};

export const signOutUser = async () => {
  await clearSessionCookie();
  redirect("/sign-in");
};
