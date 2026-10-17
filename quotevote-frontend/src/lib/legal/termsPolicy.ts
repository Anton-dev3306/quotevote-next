/**
 * Frontend Terms policy — must stay in lockstep with the backend
 * (`quotevote-backend/app/data/utils/termsPolicy.ts`).
 *
 * `CURRENT_TERMS_HASH` is SHA-256 of `termsSource.txt` (UTF-8). The contract
 * test in `src/__tests__/utils/termsPolicy.test.ts` fails if the source text
 * changes without bumping version and hash.
 */

export const CURRENT_TERMS_VERSION = "2026-10-15";

export const CURRENT_TERMS_HASH =
  "580e4c35fdc769eecadbc09737aba93059e869f1ff9bdf580ff46f58435bd5b0";
