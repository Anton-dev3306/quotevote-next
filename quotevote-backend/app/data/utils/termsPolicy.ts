/**
 * Authoritative Terms of Service version and content digest.
 *
 * The backend owns the current version identifier and SHA-256 hash of the
 * published Terms source. Clients must send this version at signup; the server
 * rejects stale or forged values and stores these constants (never client time
 * or client-supplied hash).
 *
 * When the published Terms text changes, bump CURRENT_TERMS_VERSION and
 * CURRENT_TERMS_HASH together with the matching frontend policy in
 * quotevote-frontend/src/lib/legal/termsPolicy.ts.
 *
 * @see https://github.com/QuoteVote/quotevote-next/issues/573
 */

/** Effective-date style version string for the current published Terms. */
export const CURRENT_TERMS_VERSION = '2026-10-15';

/**
 * SHA-256 (hex) of quotevote-frontend/src/lib/legal/termsSource.txt
 * (UTF-8, including trailing newline). Must match the frontend contract test.
 */
export const CURRENT_TERMS_HASH =
  '580e4c35fdc769eecadbc09737aba93059e869f1ff9bdf580ff46f58435bd5b0';

/**
 * Returns true when the client-submitted version matches the current policy.
 */
export function isCurrentTermsVersion(version: unknown): version is string {
  return typeof version === 'string' && version === CURRENT_TERMS_VERSION;
}
