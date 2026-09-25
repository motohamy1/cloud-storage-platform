import { existsSync, readFileSync } from "node:fs";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const getServiceAccount = () => {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath && existsSync(credentialsPath)) {
    const serviceAccount = JSON.parse(readFileSync(credentialsPath, "utf8")) as {
      project_id?: string;
      client_email: string;
      private_key: string;
    };

    return {
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
    };
  }

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!encoded && !raw) return undefined;

  try {
    const json = encoded ? Buffer.from(encoded, "base64").toString("utf8") : raw!;
    const serviceAccount = JSON.parse(json) as {
      project_id?: string;
      client_email: string;
      private_key: string;
    };

    return {
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    throw new Error(
      "Firebase service-account environment values are invalid. Use GOOGLE_APPLICATION_CREDENTIALS with the downloaded JSON file.",
    );
  }
};

const getFirebaseApp = () => {
  const existingApp = getApps()[0];
  if (existingApp) return existingApp;

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  const serviceAccount = getServiceAccount();
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    serviceAccount?.projectId;

  if (!projectId) {
    throw new Error(
      "Firebase project configuration is missing. Set FIREBASE_PROJECT_ID and a service account.",
    );
  }

  return initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
    projectId,
    storageBucket,
  });
};

export const getFirebaseAdmin = () => {
  const app = getFirebaseApp();

  return {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    storage: getStorage(app),
  };
};
