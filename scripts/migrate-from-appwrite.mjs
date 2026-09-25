import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const appwriteConfig = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT,
  project: process.env.NEXT_PUBLIC_APPWRITE_PROJECT,
  database: process.env.NEXT_PUBLIC_APPWRITE_DATABASE || process.env.APPWRITE_DATABASE,
  users: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION || "users",
  files: process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION || "files",
  folders: process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION || "folders",
  bucket: process.env.NEXT_PUBLIC_APPWRITE_BUCKET,
  key: process.env.NEXT_APPWRITE_KEY,
};

const firebaseConfig = () => {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath && existsSync(credentialsPath)) {
    const account = JSON.parse(readFileSync(credentialsPath, "utf8"));
    return {
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key.replace(/\\n/g, "\n"),
    };
  }

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const json = encoded ? Buffer.from(encoded, "base64").toString("utf8") : raw;
  if (!json) return undefined;

  try {
    const account = JSON.parse(json);
    return {
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    throw new Error(
      "Firebase service-account environment values are invalid. Use GOOGLE_APPLICATION_CREDENTIALS with the downloaded JSON file.",
    );
  }
};

const appwrite = () => {
  if (!appwriteConfig.endpoint || !appwriteConfig.project || !appwriteConfig.database || !appwriteConfig.bucket || !appwriteConfig.key) {
    throw new Error("Appwrite migration environment variables are incomplete");
  }
};

const appwriteRequest = async (path) => {
  const response = await fetch(`${appwriteConfig.endpoint}${path}`, {
    headers: {
      "X-Appwrite-Project": appwriteConfig.project,
      "X-Appwrite-Key": appwriteConfig.key,
      "X-Appwrite-Response-Format": "1.6.0",
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Appwrite request failed (${response.status}): ${message}`);
  }

  return response;
};

const listAll = async (collection) => {
  const documents = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const response = await appwriteRequest(
      `/databases/${appwriteConfig.database}/collections/${collection}/documents?limit=${pageSize}&offset=${offset}`,
    );
    const result = await response.json();
    documents.push(...result.documents);
    if (documents.length >= result.total) return documents;
  }
};

const timestamp = (value) => Timestamp.fromDate(value ? new Date(value) : new Date());

const userSummary = (user) => ({
  $id: user.$id,
  accountId: user.accountId,
  email: user.email,
  fullName: user.fullName,
});

const main = async () => {
  const dryRun = process.argv.includes("--dry-run");
  appwrite();
  const users = await listAll(appwriteConfig.users);
  const files = await listAll(appwriteConfig.files);
  const folders = await listAll(appwriteConfig.folders);
  const profiles = new Map(users.map((user) => [user.$id, user]));

  if (dryRun) {
    console.log(JSON.stringify({ users: users.length, files: files.length, folders: folders.length }));
    return;
  }

  const serviceAccount = firebaseConfig();
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    serviceAccount?.projectId;

  if (!projectId) {
    throw new Error(
      "Firebase is not configured. Set FIREBASE_PROJECT_ID and a service account, or set FIREBASE_SERVICE_ACCOUNT_JSON/FIREBASE_SERVICE_ACCOUNT_BASE64.",
    );
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!serviceAccount && (!credentialsPath || !existsSync(credentialsPath))) {
    throw new Error(
      "Firebase service-account credentials are missing. Download the service-account JSON and save it at ./secrets/firebase-service-account.json.",
    );
  }

  const firebaseApp = getApps()[0] || initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
    projectId,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
  const firestore = getFirestore(firebaseApp);
  const storage = getStorage(firebaseApp);
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
  const report = {
    startedAt: new Date().toISOString(),
    users: users.length,
    files: files.length,
    folders: folders.length,
    migratedFiles: 0,
    missingProfiles: 0,
    auth: "Appwrite credentials were not migrated. Users must register again in Firebase.",
  };

  for (const user of users) {
    const document = {
      accountId: user.accountId,
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatar,
      createdAt: timestamp(user.$createdAt),
      updatedAt: timestamp(user.$updatedAt),
      migratedAt: FieldValue.serverTimestamp(),
    };
    await firestore.collection("users").doc(user.$id).set(document, { merge: true });
  }

  for (const folder of folders) {
    await firestore.collection("folders").doc(folder.$id).set({
      name: folder.name,
      parentId: folder.parentId || "root",
      accountId: folder.accountId,
      createdAt: timestamp(folder.$createdAt),
      updatedAt: timestamp(folder.$updatedAt),
      migratedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  for (const file of files) {
    const sourcePath = `migrated/${file.$id}/${file.name}`;
    const sourceResponse = await appwriteRequest(
      `/storage/buckets/${appwriteConfig.bucket}/files/${encodeURIComponent(file.bucketField)}/download`,
    );
    const content = Buffer.from(await sourceResponse.arrayBuffer());
    await bucket.file(sourcePath).save(content, { resumable: false, metadata: { contentType: file.mimeType || "application/octet-stream" } });
    const sharedUsers = Array.isArray(file.users)
      ? file.users.map((value) => profiles.get(typeof value === "string" ? value : value.$id)).filter(Boolean).map(userSummary)
      : [];
    await firestore.collection("files").doc(file.$id).set({
      type: file.type,
      name: file.name,
      url: `/api/files/${file.$id}`,
      extension: file.extension,
      size: Number(file.sizeOriginal || file.size || content.length),
      owner: typeof file.owner === "string" ? file.owner : file.owner?.$id || "",
      accountId: file.accountId,
      bucketField: sourcePath,
      users: sharedUsers,
      folderId: file.folderId || "root",
      inTrash: file.inTrash === true,
      deletedAt: file.deletedAt || null,
      favorite: file.favorite === true,
      shareId: file.shareId || null,
      sharePermission: file.sharePermission || null,
      shareExpiry: file.shareExpiry || null,
      createdAt: timestamp(file.$createdAt),
      updatedAt: timestamp(file.$updatedAt),
      migratedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    report.migratedFiles += 1;
    if (!profiles.has(typeof file.owner === "string" ? file.owner : file.owner?.$id || "")) {
      report.missingProfiles += 1;
    }
  }

  report.finishedAt = new Date().toISOString();
  await writeFile("firebase-migration-report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
