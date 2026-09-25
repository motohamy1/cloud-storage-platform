<div align="center">
  <br />
    <a href="https://youtu.be/lie0cr3wESQ" target="_blank">
      <img src="public/readme/hero.png" alt="Project Banner">
    </a>
  <br />

  <div>
     <img src="https://img.shields.io/badge/-Next_JS-black?style=for-the-badge&logoColor=white&logo=nextdotjs&color=000000" alt="nextdotjs" />
    <img src="https://img.shields.io/badge/-TypeScript-black?style=for-the-badge&logoColor=white&logo=typescript&color=3178C6" alt="typescript" />
    <img src="https://img.shields.io/badge/-Tailwind_CSS-black?style=for-the-badge&logoColor=white&logo=tailwindcss&color=06B6D4" alt="tailwindcss" />
    <img src="https://img.shields.io/badge/-Firebase-black?style=for-the-badge&logoColor=white&logo=firebase&color=FFCA28" alt="Firebase" />
  </div>

<h3 align="center">Storage and File Sharing Platform</h3>





## <a name="introduction">🤖 Introduction</a>

A storage management and file sharing platform that lets users effortlessly upload, organize, and share files. Built with Next.js 15 and Firebase Authentication, Cloud Firestore, and Cloud Storage.

If you're getting started and need assistance or face any bugs, join our active Discord community with over **34k+**
members. It's a place where people help each other out.


## <a name="tech-stack">⚙️ Tech Stack</a>

- React 19
- Next.js 15
- Firebase Authentication
- Cloud Firestore
- Cloud Storage
- TailwindCSS
- ShadCN
- TypeScript

## <a name="features">🔋 Features</a>

👉 **User Authentication with Firebase**: Implement signup, login, and logout functionality using Firebase Authentication session cookies.

👉 **FIle Uploads**: Effortlessly upload a variety of file types, including documents, images, videos, and audio, ensuring all your important data.

👉 **View and Manage Files**: Users can browse through files stored in Cloud Storage, view them securely, rename them, or delete them.

👉 **Download Files**: Users can download their uploaded files giving them instant access to essential documents.

👉 **File Sharing**: Users can easily share their uploaded files with others, enabling collaboration and easy access to important content.

👉 **Dashboard**: Gain insights at a glance with a dynamic dashboard that showcases total and consumed storage, recent uploads, and a summary of files grouped by type.

👉 **Global Search**: Users can quickly find files and shared content across the platform with a robust global search feature.

👉 **Sorting Options**: Organize files efficiently by sorting them by date, name, or size, making file management a breeze.

👉 **Modern Responsive Design**: A fresh and minimalist UI that emphasizes usability, ensuring a clean aesthetic across all devices.

and many more, including the latest **React 19**, **Next.js 15**, and **Firebase** services alongside code architecture and
reusability

## <a name="quick-start">🤸 Quick Start</a>

Follow these steps to set up the project locally on your machine.

**Prerequisites**

Make sure you have the following installed on your machine:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en)
- [npm](https://www.npmjs.com/) (Node Package Manager)


```

**Installation**

Install the project dependencies using npm:

```bash
npm install
```

**Set Up Environment Variables**

Create a new file named `.env` or `.env.local` in the root of your project and add the following content:

```env
FIREBASE_PROJECT_ID="cloud-store-platform"
FIREBASE_STORAGE_BUCKET="cloud-store-platform.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="cloud-store-platform"
NEXT_PUBLIC_FIREBASE_API_KEY="your-web-api-key"
GOOGLE_APPLICATION_CREDENTIALS="./secrets/firebase-service-account.json"
```

Create a Firebase project, enable Email/Password Authentication, create a Firestore database, and create a Cloud Storage bucket. Download a Firebase service-account JSON, place it at `./secrets/firebase-service-account.json`, and keep that directory ignored by Git. The service account must not be exposed to the browser. `NEXT_PUBLIC_FIREBASE_API_KEY` is the Firebase Web API key used by the server to exchange email/password credentials for a Firebase session.

**Migrating Existing Appwrite Data**

The migration command copies Appwrite user profiles, folders, file metadata, and stored objects to Firebase. Appwrite password hashes are not exported, so existing users must register again in Firebase.

```bash
npm run migrate:appwrite
```

Use `node --env-file=.env scripts/migrate-from-appwrite.mjs --dry-run` first to inspect counts without writing to Firebase. The command writes `firebase-migration-report.json` after a successful run. Keep the Appwrite project and local exports until the Firebase deployment has been verified.

**Running the Project**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the project.


