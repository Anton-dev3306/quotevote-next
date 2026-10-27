# Next.js Metadata Verification (Issue #92)

Verification of route-level metadata after the `react-helmet-async` → Next.js Metadata API migration.

- **Commit verified:** `f9480df` (main)
- **Method:** source inventory of every `page.tsx` / `layout.tsx` under `quotevote-frontend/src/app`, `pnpm build`, then `pnpm start` and inspection of the server-rendered `<head>` with `curl`.

## Summary

| Acceptance criterion | Result |
| --- | --- |
| No active `react-helmet-async` usage | ✅ Pass — not in `package.json` or lockfile; no imports |
| Root metadata renders through Metadata API | ✅ Pass — `src/app/layout.tsx` exports `metadata` |
| Important public routes have intentional titles and descriptions | ⚠️ Partial — all public static routes have titles; 8 inherit the root description |
| Dynamic public content has entity-specific metadata | ⚠️ Partial — profile yes; post detail no |
| Canonical, Open Graph and Twitter tags are valid | ❌ Fail — see findings 1–3 |
| Production build completes without metadata errors | ✅ Pass — no metadata warnings |

## Route inventory

**Public — static**

| Route | Title | Own description | Own OG/Twitter |
| --- | --- | --- | --- |
| `/` | ✅ | ✅ | ✅ |
| `/about` | ✅ | ✅ | ❌ inherits root |
| `/plan` | ✅ | ✅ | ❌ inherits root |
| `/terms` | ✅ | ❌ | ❌ inherits root |
| `/code-of-conduct` | ✅ | ❌ | ❌ inherits root |
| `/contributing` | ✅ | ❌ | ❌ inherits root |
| `/auths/login` | ✅ | ❌ | ❌ inherits root |
| `/auths/signup` | ✅ | ❌ | ❌ inherits root |
| `/auths/request-access` | ✅ | ❌ | ❌ inherits root |
| `/auths/forgot-password` | ✅ | ❌ | ❌ inherits root |
| `/auths/password-reset` | ✅ | ❌ | ❌ inherits root |
| `/auths/investor-thanks` | ✅ | ✅ | ❌ inherits root |

**Public — dynamic**

| Route | Metadata | Notes |
| --- | --- | --- |
| `/profile/[username]` | `generateMetadata()` | Title/description use the username; OG/Twitter inherit root |
| `/post/[group]/[title]/[postId]` | none | Page is `'use client'`, so it cannot export metadata; renders the generic root title |
| `/profile/[username]/followers`, `/following` | none | `'use client'` pages; inherit root |

**Authenticated** (middleware redirects to `/auths/login` when signed out)

| Route | Metadata |
| --- | --- |
| `/post`, `/profile`, `/settings`, `/notifications`, `/manage-invites`, `/control-panel`, `/profile/[username]/edit` | static `metadata` (title + description) |
| `/profile/[username]/avatar` | none (`'use client'`) |

**Utility / redirect** — no metadata, low priority

| Route | Notes |
| --- | --- |
| `/dashboard/[[...path]]` | Server `redirect()` only; metadata not needed |
| `/logout` | Client redirect |
| `/error`, `/auths/error-page`, `/unauth` | Render root title; candidates for `robots: noindex` |

## Rendered `<head>` checks

From `pnpm start` with no backend running:

| Route | `<title>` | `og:title` | `og:url` |
| --- | --- | --- | --- |
| `/` | Quote.Vote – Share Ideas. Vote on What Matters. | same | `https://quote.vote` |
| `/about` | About — Quote.Vote | **Quote.Vote** | **`https://quote.vote`** |
| `/terms` | Terms of Service - Quote.Vote | **Quote.Vote** | **`https://quote.vote`** |
| `/auths/login` | Sign In — Quote.Vote | **Quote.Vote** | **`https://quote.vote`** |
| `/profile/testuser` | @testuser — Quote.Vote | **Quote.Vote** | **`https://quote.vote`** |
| `/post/general/hello/abc123` | **Quote.Vote - Text-First Platform…** | **Quote.Vote** | **`https://quote.vote`** |
| `/settings` | 307 → `/auths/login?callbackUrl=%2Fsettings` | — | — |

No route rendered `<link rel="canonical">`, `og:image`, or `twitter:image`.

## Findings

1. **OG/Twitter tags are wrong on every route except `/`.** Next.js replaces nested `openGraph`/`twitter` objects rather than merging them, so pages that set only `title`/`description` keep the root's `og:title="Quote.Vote"`, `og:url="https://quote.vote"` and root `og:description`. Shared links for `/about`, profiles, etc. preview as the home page.
2. **No canonical URLs.** No `metadataBase` or `alternates.canonical` is set anywhere.
3. **No social image.** `twitter:card` is `summary_large_image` but no `og:image`/`twitter:image` exists, and there is no `opengraph-image` file in `src/app`.
4. **Post detail has no entity metadata.** `post/[group]/[title]/[postId]/page.tsx` is a client component and there is no server-side GraphQL fetch helper, so adding `generateMetadata()` needs a server wrapper plus a server data fetch.
5. **Eight public routes inherit the root description** (`/terms`, `/code-of-conduct`, `/contributing`, and the five `/auths/*` pages listed above).
6. **Title separators are inconsistent** (`—`, `-`, `–`). A `title.template` in the root layout would standardise them.
7. **Unused legacy SEO helpers.** `src/components/common/SEOHead.tsx` and `src/hooks/useSEOHead.ts` (DOM-based replacements for Helmet) are not used by any route — only by their own tests and a barrel export.

## Build result

`pnpm build` (Next.js 16.1.1): exit 0, compiled and type-checked successfully, 16 static pages generated, no metadata-related warnings. The only warning was the Node engine mismatch on the verifying machine (Node 22 vs `engines.node: 24.x`).

## Suggested follow-up issues

Per the scope note, these can be opened as smaller route-specific issues:

1. Set `metadataBase` and a `title.template` in the root layout; give each public page its own `openGraph`/`twitter` title, description and `url` plus `alternates.canonical` (findings 1, 2, 5, 6).
2. Add a default social image (`src/app/opengraph-image.*` or `public/` asset) (finding 3).
3. Add server-side `generateMetadata()` for post detail with post title/excerpt (finding 4).
4. Extend profile `generateMetadata()` with OG/Twitter fields and canonical URL (finding 1).
5. Add `robots: { index: false }` to error, unauth and authenticated routes.
6. Remove unused `SEOHead` / `useSEOHead` and their tests (finding 7).
