import { expect, test } from "@playwright/test";

/**
 * The legacy API emails links under `/auth/*` (invite approval signup, password reset,
 * request access). This app serves those pages under `/auths/*`, so next.config.ts
 * redirects them. The query string (e.g. the invite `token`) must survive the redirect.
 */
test.describe("Legacy /auth/* email links redirect to /auths/*", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const cases = [
    { from: "/auth/signup?token=e2e-token", to: "/auths/signup?token=e2e-token" },
    {
      from: "/auth/password-reset?token=e2e-token&username=e2e-user",
      to: "/auths/password-reset?token=e2e-token&username=e2e-user",
    },
    { from: "/auth/request-access", to: "/auths/request-access" },
  ];

  for (const { from, to } of cases) {
    test(`${from} lands on ${to}`, async ({ page }) => {
      const response = await page.goto(from);

      expect(response?.status()).not.toBe(404);
      await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === to);
    });
  }
});
