// src/firebase.ts
// Rebuilt Universal Auth & Sheets Token Bridge (Zero Firebase Dependency)

export interface UniversalAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export const db = {};
export const auth = {
  currentUser: null as UniversalAuthUser | null,
  signOut: async () => {
    cachedAccessToken = null;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('dkandang_sheets_oauth_token');
    }
  }
};

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly'
];

let cachedAccessToken: string | null =
  typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem('dkandang_sheets_oauth_token')
    : null;

export const initSheetsAuth = (
  onAuthSuccess?: (user: UniversalAuthUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (cachedAccessToken) {
    const mockUser: UniversalAuthUser = {
      uid: 'sheets_oauth_user',
      email: 'admin@dkandang.id',
      displayName: 'D\'Kandang Sheets Sync'
    };
    if (onAuthSuccess) onAuthSuccess(mockUser, cachedAccessToken);
  } else {
    if (onAuthFailure) onAuthFailure();
  }
  return () => {};
};

export const googleSignInForSheets = async (): Promise<{ user: UniversalAuthUser; accessToken: string }> => {
  const manualToken = typeof window !== 'undefined'
    ? window.prompt(
        'Masukkan Google OAuth Access Token (atau kosongkan jika menggunakan mode Public Link / CSV Export):',
        cachedAccessToken || ''
      )
    : '';

  if (!manualToken || !manualToken.trim()) {
    throw new Error('OAuth dibatalkan. Gunakan opsi Public Link / CSV atau Webhook Google Apps Script.');
  }

  cachedAccessToken = manualToken.trim();
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('dkandang_sheets_oauth_token', cachedAccessToken);
  }

  const user: UniversalAuthUser = {
    uid: 'sheets_oauth_user',
    email: 'admin@dkandang.id',
    displayName: 'D\'Kandang Sheets Sync'
  };

  return { user, accessToken: cachedAccessToken };
};

export const getSheetsAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logoutGoogleSheets = async (): Promise<void> => {
  await auth.signOut();
};

export default {};