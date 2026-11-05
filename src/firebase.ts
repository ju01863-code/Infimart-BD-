import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, limit, query, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import localConfig from '../firebase-applet-config.json';

// Support production environment variables (e.g., when deployed from GitHub to Vercel/Netlify/Cloud Run)
// with fallback to firebase-applet-config.json for AI Studio development
export const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || localConfig?.apiKey || '',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || localConfig?.authDomain || '',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || localConfig?.projectId || '',
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || localConfig?.storageBucket || '',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || localConfig?.messagingSenderId || '',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || localConfig?.appId || '',
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string) || localConfig?.measurementId || '',
  firestoreDatabaseId: (import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || localConfig?.firestoreDatabaseId || '(default)',
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom Database ID
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Connection test helper function
export async function testFirebaseConnection(): Promise<{
  firestoreConnected: boolean;
  storageConnected: boolean;
  firestoreMessage: string;
  storageMessage: string;
}> {
  let firestoreConnected = false;
  let firestoreMessage = '';
  let storageConnected = false;
  let storageMessage = '';

  // 1. Test Firestore
  try {
    const q = query(collection(db, 'products'), limit(1));
    await getDocs(q);
    firestoreConnected = true;
    firestoreMessage = 'ফায়ারস্টোর ডাটাবেজ সফলভাবে সংযুক্ত রয়েছে (Firestore Connected)';
  } catch (err: unknown) {
    const error = err as Error;
    firestoreConnected = false;
    firestoreMessage = `ফায়ারস্টোর সংযোগে সমস্যা: ${error?.message || 'অজ্ঞাত ত্রুটি'}`;
  }

  // 2. Test Storage with timeout
  try {
    const testPromise = async () => {
      const testRef = ref(storage, 'ping.txt');
      await uploadBytes(testRef, new Blob(['ping'], { type: 'text/plain' }));
      return await getDownloadURL(testRef);
    };

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Storage connection timed out (সময় অতিক্রম করেছে)')), 3000)
    );

    await Promise.race([testPromise(), timeoutPromise]);
    storageConnected = true;
    storageMessage = 'ফায়ারবেস স্টোরেজ সফলভাবে সংযুক্ত রয়েছে (Storage Connected)';
  } catch (err: unknown) {
    const error = err as Error;
    storageConnected = false;
    storageMessage = `ফায়ারবেস স্টোরেজ প্রস্তুত নয় (${error?.message || 'Bucket not provisioned'}). স্বয়ংক্রিয়ভাবে অপটিমাইজড ইমেজ ব্যবহার করা হবে।`;
  }

  return {
    firestoreConnected,
    storageConnected,
    firestoreMessage,
    storageMessage,
  };
}

export default app;
