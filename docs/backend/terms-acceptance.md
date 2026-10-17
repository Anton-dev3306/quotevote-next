# Terms acceptance (#573)

## Source of truth

| Concern                  | Location                                                                    |
| ------------------------ | --------------------------------------------------------------------------- |
| Current version string   | `quotevote-backend/app/data/utils/termsPolicy.ts` (`CURRENT_TERMS_VERSION`) |
| Content digest (SHA-256) | Same file (`CURRENT_TERMS_HASH`) — must match frontend                      |
| Published Terms text     | `quotevote-frontend/src/lib/legal/termsSource.txt`                          |
| Frontend mirror          | `quotevote-frontend/src/lib/legal/termsPolicy.ts`                           |
| Contract test            | `quotevote-frontend/src/__tests__/utils/termsPolicy.test.ts`                |

When Terms text changes: update `termsSource.txt`, recompute the SHA-256 hex digest, bump `CURRENT_TERMS_VERSION` and `CURRENT_TERMS_HASH` in **both** packages, then re-run the frontend contract test.

The server never trusts a client-supplied hash or timestamp. It only accepts `acceptedTermsVersion === CURRENT_TERMS_VERSION` and stores the server constants.

## Persistence

Append-only Prisma model `TermsAcceptance` (`terms_acceptances` collection):

- `userId` — from the created/invited user (never a client-forged identity)
- `termsVersion`, `termsHash` — server constants at write time
- `acceptedAt` — `@default(now())`
- `source` — `direct_registration` \| `invite_completion`
- `@@unique([userId, termsVersion])`

No `User.acceptedTerms` boolean. Legacy accounts with no row remain distinguishable as never accepted. No backfill. No IP/UA by default.

Acceptance records are **not** exposed on public User GraphQL fields. Future support retrieval should be an admin-only query.

## Enforcement

1. **`POST /auth/register`** — requires `acceptedTermsVersion`. Nested `prisma.user.create` + `termsAcceptances.create` (MongoDB replica set / Prisma transactions already required by the migration strategy).
2. **`completeSignup(token, username, password, acceptedTermsVersion)`** — invite completion only. Invite JWTs have `type: invite_signup` and are rejected by `verifyToken` for general sessions.
3. **`updateUser`** — cannot set passwords or finish pending invite accounts.
4. **`POST /auth/guest`** — removed (consentless accounts).

## Invitation flow (ported for Terms gate)

1. `requestUserAccess` — creates `accountStatus: pending` user (email as temporary username, no password).
2. `sendUserInviteApproval` (admin) — on approve, emails a one-day invite-signup token (not a session JWT).
3. `verifyInviteSignupToken` — public query for the signup form.
4. `completeSignup` — sets username/password, activates account, writes `TermsAcceptance` with `invite_completion`.

## Retention and cutover

Retention follows the Privacy Notice (#566 / #569) and account-deletion policy. Do not enable the production Terms gate until Privacy Notice publication, Terms effective date, and founder go-live approval for v2.0.0 are coordinated with #568/#569.

**Route note:** the Next.js frontend posts direct registration to `/auth/register` on the new backend. Confirm production routing vs legacy `/register` before cutover.
