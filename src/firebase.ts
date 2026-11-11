import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { 
  getAuth, 
  setPersistence, 
  browserSessionPersistence, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const DEFAULT_DATABASE_ID = 'ai-studio-enterpriseerpsui-e27ce803-3306-4871-9d24-42d035ed0be3';
const targetDbId = (firebaseConfig as Record<string, string>).firestoreDatabaseId || DEFAULT_DATABASE_ID;

export const db = targetDbId 
  ? getFirestore(app, targetDbId)
  : getFirestore(app);

// Inisialisasi Firebase Auth dengan Anti Auto-Login (browserSessionPersistence)
// Memastikan sesi otomatis terhapus saat tab atau window browser ditutup
export const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence).catch((err) => {
  console.warn('[Firebase Auth] Sesi browserSessionPersistence gagal diatur:', err);
});

// Google Workspace OAuth Scopes (Google Sheets Readonly)
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly'
];

const googleProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => googleProvider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initSheetsAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignInForSheets = async (): Promise<{ user: FirebaseUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan access token Google Sheets dari autentikasi Google.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('[Google Sheets OAuth] Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getSheetsAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logoutGoogleSheets = async (): Promise<void> => {
  await auth.signOut();
  cachedAccessToken = null;
};

export default app;

