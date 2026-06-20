import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously as firebaseSignInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  projectId: "quirky-rex-9k91c",
  appId: "1:921575850517:web:55b1dc8c9223522779c41c",
  apiKey: "AIzaSyCMNHgutEJO3v7tq3KdptcM-te29gILNtM",
  authDomain: "quirky-rex-9k91c.firebaseapp.com",
  storageBucket: "quirky-rex-9k91c.firebasestorage.app",
  messagingSenderId: "921575850517"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom database ID provisioned down below
const databaseId = "ai-studio-7a1fb3d0-5e68-49de-ba4e-c8360b78d06a";
const db = getFirestore(app, databaseId);

// Initialize Authentication
const auth = getAuth(app);

/**
 * Perform implicit anonymous login to let users perform verified mutations
 */
export async function authenticateUser() {
  try {
    if (!auth.currentUser) {
      const credential = await firebaseSignInAnonymously(auth);
      console.log("Implicit Clubhouse session authorized:", credential.user.uid);
      return credential.user;
    }
    return auth.currentUser;
  } catch (error) {
    console.warn("Firebase implicit authentication failure, continuing with sandbox profile:", error);
    return null;
  }
}

export { db, auth };
