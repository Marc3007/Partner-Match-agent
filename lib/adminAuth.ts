/**
 * Deliberately simple: one shared admin password (ADMIN_PASSWORD env var)
 * and a signed, expiring session cookie -- not a real user-account system,
 * per the explicit spec ("simple password/login gate is fine for now").
 * Written with Web Crypto (`crypto.subtle`, `btoa`/`atob`) instead of
 * Node's `Buffer`/`crypto` module so the exact same code works whether
 * middleware.ts runs on the Edge runtime or the Node.js runtime.
 */

const COOKIE_NAME = 'admin_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64url.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getSigningKey(): Promise<CryptoKey> {
  // Keyed by ADMIN_PASSWORD itself so no second secret is required to get
  // started -- if the password is ever rotated, all existing sessions are
  // invalidated for free as a side effect, which is the right behavior.
  const secret = process.env.ADMIN_PASSWORD ?? '';
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

export async function createAdminSessionToken(): Promise<string> {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_DURATION_MS });
  const payloadB64 = bytesToBase64Url(new TextEncoder().encode(payload));
  const key = await getSigningKey();
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${bytesToBase64Url(new Uint8Array(sig))}`;
}

export async function verifyAdminSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) return false;
  try {
    const key = await getSigningKey();
    const expectedSig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
    const expectedB64 = bytesToBase64Url(new Uint8Array(expectedSig));
    if (expectedB64 !== sigB64) return false;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64))) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

/** Constant-time-ish comparison so response timing doesn't leak how many
 * leading characters of a guessed password were correct. Not a substitute
 * for rate limiting, which Vercel's platform-level protections handle. */
export function passwordMatches(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false; // fail closed if never configured
  if (candidate.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= candidate.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_COOKIE_MAX_AGE_SECONDS = SESSION_DURATION_MS / 1000;
