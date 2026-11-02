import { auth } from './firebase';

/**
 * Sends a same-origin API request with the current Firebase ID token.
 * Firebase automatically refreshes the token when needed.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in to use this feature.');
  }

  const idToken = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${idToken}`);

  return fetch(input, {
    ...init,
    headers,
  });
}
