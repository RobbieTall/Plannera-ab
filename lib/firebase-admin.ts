import * as admin from "firebase-admin";

function getFirebaseApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are not configured");
  }

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

// Lazy initializer — avoids running at build time when env vars may be absent.
// All auth operations go through this function.
export function getFirebaseAuth(): admin.auth.Auth {
  return getFirebaseApp().auth();
}

// Proxy preserves the call-site API (`firebaseAuth.verifyIdToken(...)`) while
// deferring SDK initialization to first actual use.
export const firebaseAuth: Pick<admin.auth.Auth, "verifyIdToken" | "createCustomToken" | "getUser"> = {
  verifyIdToken: (...args) => getFirebaseAuth().verifyIdToken(...args),
  createCustomToken: (...args) => getFirebaseAuth().createCustomToken(...args),
  getUser: (...args) => getFirebaseAuth().getUser(...args),
};
