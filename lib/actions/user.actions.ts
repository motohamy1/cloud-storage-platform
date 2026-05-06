"use server";

import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { Query, ID } from "node-appwrite";
import { parseStringify } from "@/lib/utils";
import { cookies } from "next/headers";
import { avatarPlaceholderUrl } from "@/constants";
import { redirect } from "next/navigation";

const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient();

  try {
    const result = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.usersCollection,
      [Query.equal("email", [email])],
    );

    return result.total > 0 ? result.documents[0] : null;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
};

const handleError = (error: unknown, message: string) => {
  console.error(message, error);
  if (error instanceof Error) {
    throw new Error(`${message}: ${error.message}`);
  }
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
  try {
    const { account } = await createAdminClient();
    const { databases } = await createAdminClient();

    let userId: string;

    try {
      const user = await account.create(ID.unique(), email, password, fullName);
      userId = user.$id;
    } catch (error: unknown) {
      const errorObj = error as { type?: string; message?: string };
      if (errorObj?.type === "user_already_exists") {
        try {
          const session = await account.createEmailPasswordSession(
            email,
            password,
          );

          (await cookies()).set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
          });

          return parseStringify({ user: { email }, alreadyExisted: true });
        } catch {
          throw new Error(
            "An account with this email already exists. Please sign in with your existing password.",
          );
        }
      }
      throw error;
    }

    const session = await account.createEmailPasswordSession(email, password);

    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    const existingUser = await getUserByEmail(email);
    if (!existingUser) {
      await databases.createDocument(
        appwriteConfig.database,
        appwriteConfig.usersCollection,
        ID.unique(),
        {
          fullName,
          email,
          avatar: avatarPlaceholderUrl,
          accountId: userId,
        },
      );
    }

    return parseStringify({ user: { id: userId, email, fullName } });
  } catch (error) {
    handleError(error, "Failed to sign up");
  }
};

export const signIn = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  try {
    const { account } = await createAdminClient();

    const session = await account.createEmailPasswordSession(email, password);

    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify({ sessionId: session.$id });
  } catch (error: unknown) {
    const errorObj = error as { type?: string; code?: number };
    if (
      errorObj?.type === "user_invalid_credentials" ||
      errorObj?.code === 401
    ) {
      throw new Error(
        "Invalid email or password. Please check your credentials.",
      );
    }
    handleError(error, "Failed to sign in");
  }
};

export const getCurrentUser = async () => {
  try {
    const { account } = await createSessionClient();
    const { databases } = await createAdminClient();

    const result = await account.get();

    const user = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.usersCollection,
      [Query.equal("accountId", result.$id)],
    );

    if (user.total <= 0) return null;

    return parseStringify(user.documents[0]);
  } catch (error) {
    return null;
  }
};

export const signOutUser = async () => {
  const { account } = await createSessionClient();

  try {
    await account.deleteSession("current");
    (await cookies()).delete("appwrite-session");
  } catch (error) {
    handleError(error, "Failed to sign out user");
  } finally {
    redirect("/sign-in");
  }
};
