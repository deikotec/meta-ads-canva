import { initializeApp, getApps, getApp, cert, ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const serviceAccount: ServiceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined,
};

// Initialize Firebase Admin (Singleton pattern)
// Note: This should only run on the server.
function getFirebaseAdminApp() {
  if (getApps().length) {
    return getApp();
  }

  if (!process.env.FIREBASE_PRIVATE_KEY) {
      console.warn("Missing FIREBASE_PRIVATE_KEY - using dummy admin app for build");
      return initializeApp({ projectId: 'dummy-project' });
  }

  return initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const adminApp = getFirebaseAdminApp();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);
const adminStorage = getStorage(adminApp);

export { adminAuth, adminDb, adminStorage };
