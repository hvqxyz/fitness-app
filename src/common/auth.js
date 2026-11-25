import { GOOGLE_CLIENT_ID } from './config.js';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const SCOPE = `${DRIVE_SCOPE} openid profile`;
const SESSION_KEY = 'fitness-counter-google-token';

let tokenClient = null;
let accessToken = null;
let tokenExpiry = 0;
let userProfile = null;
let forceConsent = false;

function loadFromSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return;
  try {
    const { token, expiry, scope } = JSON.parse(raw);
    // Drop tokens cached without the Drive scope (e.g. from an older build or
    // a consent screen where the Drive checkbox was left unticked).
    if (token && expiry > Date.now() && hasDriveScope(scope)) {
      accessToken = token;
      tokenExpiry = expiry;
    }
  } catch {
    // ignore malformed session cache
  }
}

function hasDriveScope(scope) {
  return typeof scope === 'string' && scope.split(' ').includes(DRIVE_SCOPE);
}

function saveToSession(scope) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: accessToken, expiry: tokenExpiry, scope }));
}

/**
 * Forgets the current token so the next getAccessToken() asks Google again,
 * showing the consent screen. Used when Google rejects the token for missing
 * scopes.
 */
export function invalidateToken() {
  accessToken = null;
  tokenExpiry = 0;
  forceConsent = true;
  sessionStorage.removeItem(SESSION_KEY);
}

loadFromSession();

function ensureTokenClient() {
  if (tokenClient) return tokenClient;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPE,
    callback: () => {},
  });
  return tokenClient;
}

export function isSignedIn() {
  return !!accessToken && Date.now() < tokenExpiry;
}

/**
 * Resolves with a valid access token, prompting a Google sign-in popup if
 * needed. Must be called from a user-gesture handler (e.g. a button click)
 * the first time, since browsers block un-requested popups otherwise.
 */
export function getAccessToken() {
  if (isSignedIn()) return Promise.resolve(accessToken);

  return new Promise((resolve, reject) => {
    const client = ensureTokenClient();
    client.callback = (resp) => {
      if (resp.error) {
        reject(new Error(resp.error_description || resp.error));
        return;
      }
      if (!google.accounts.oauth2.hasGrantedAllScopes(resp, DRIVE_SCOPE)) {
        forceConsent = true;
        reject(new Error(
          'Google Drive access was not granted. Sign in again and tick the ' +
          '"See, edit, create and delete only the specific Google Drive files you use with this app" checkbox.'
        ));
        return;
      }
      accessToken = resp.access_token;
      tokenExpiry = Date.now() + (resp.expires_in - 60) * 1000;
      forceConsent = false;
      saveToSession(resp.scope);
      resolve(accessToken);
    };
    client.requestAccessToken({ prompt: forceConsent ? 'consent' : '' });
  });
}

export function signOut() {
  if (accessToken && window.google?.accounts?.oauth2) {
    google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  tokenExpiry = 0;
  userProfile = null;
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * The signed-in user's Google name/email/picture, via the OpenID userinfo
 * endpoint (needs the "openid profile" scope on top of the Drive scope).
 * Fetched once per session and cached in memory.
 */
export async function getUserProfile() {
  if (userProfile) return userProfile;

  const token = await getAccessToken();
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Couldn't load Google profile (${res.status})`);

  const { name, email, picture } = await res.json();
  userProfile = { name, email, picture };
  return userProfile;
}
