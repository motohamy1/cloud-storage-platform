import { getFirebaseAdmin } from "@/lib/firebase";

export const SESSION_COOKIE = "basketstar-session";
export const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

const apiKey = () => {
  const value = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!value) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not configured");
  return value;
};

const getUserCollection = () => getFirebaseAdmin().firestore.collection("users");

const serializeUser = (id: string, data: Record<string, unknown>) => {
  const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
  const updatedAt = data.updatedAt as { toDate?: () => Date } | undefined;

  return {
    $id: id,
    $createdAt: createdAt?.toDate?.().toISOString() ?? "",
    $updatedAt: updatedAt?.toDate?.().toISOString() ?? "",
    accountId: String(data.accountId ?? ""),
    fullName: String(data.fullName ?? ""),
    email: String(data.email ?? ""),
    avatar: String(data.avatar ?? ""),
    emailVerified: data.emailVerified === true,
  };
};

export const getUserByEmail = async (email: string) => {
  const snapshot = await getUserCollection()
    .where("email", "==", email.trim().toLowerCase())
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const document = snapshot.docs[0];
  return serializeUser(document.id, document.data());
};

export const getUserByAccountId = async (accountId: string) => {
  const snapshot = await getUserCollection()
    .where("accountId", "==", accountId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const document = snapshot.docs[0];
  return serializeUser(document.id, document.data());
};

export const createUserProfile = async ({
  uid,
  fullName,
  email,
  avatar,
}: {
  uid: string;
  fullName: string;
  email: string;
  avatar: string;
}) => {
  const { firestore } = getFirebaseAdmin();
  const reference = firestore.collection("users").doc(uid);
  const timestamp = new Date();

  await reference.set({
    accountId: uid,
    fullName,
    email: email.trim().toLowerCase(),
    avatar,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return serializeUser(uid, {
    accountId: uid,
    fullName,
    email: email.trim().toLowerCase(),
    avatar,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
};

export const getUserIdToken = async (email: string, password: string) => {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey())}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, returnSecureToken: true }),
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as {
    idToken?: string;
    error?: { message?: string };
  };

  if (!response.ok || !payload.idToken) {
    const message = payload.error?.message ?? "Invalid email or password";
    if (message.includes("INVALID_LOGIN_CREDENTIALS")) {
      throw new Error("Invalid email or password. Please check your credentials.");
    }
    throw new Error("Unable to sign in with Firebase. Please try again.");
  }

  return payload.idToken;
};

export const getSessionUser = async () => {
  const { auth } = getFirebaseAdmin();
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionCookie) return null;

  try {
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    const profile = await getUserByAccountId(decodedToken.uid);
    if (!profile) return null;

    const authUser = await auth.getUser(decodedToken.uid);

    return { ...profile, emailVerified: authUser.emailVerified === true };
  } catch {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }
};

export const setSessionCookie = async (idToken: string) => {
  const { auth } = getFirebaseAdmin();
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_MS,
  });

  cookieStore.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
};

export const clearSessionCookie = async () => {
  const { auth } = getFirebaseAdmin();
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionCookie) {
    try {
      const decodedToken = await auth.verifySessionCookie(sessionCookie, false);
      await auth.revokeRefreshTokens(decodedToken.sub);
    } catch {
      cookieStore.delete(SESSION_COOKIE);
      return;
    }
  }

  cookieStore.delete(SESSION_COOKIE);
};
