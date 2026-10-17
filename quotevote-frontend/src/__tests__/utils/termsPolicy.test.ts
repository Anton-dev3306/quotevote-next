/**
 * Contract: Terms source text, version, and hash must move together (#573).
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CURRENT_TERMS_HASH, CURRENT_TERMS_VERSION } from "@/lib/legal/termsPolicy";

describe("termsPolicy contract", () => {
  it("exposes a non-empty Terms version string", () => {
    expect(CURRENT_TERMS_VERSION.length).toBeGreaterThan(0);
  });

  it("matches SHA-256 of termsSource.txt — bump version + hash when text changes", () => {
    const sourcePath = join(process.cwd(), "src/lib/legal/termsSource.txt");
    const source = readFileSync(sourcePath);
    const digest = createHash("sha256").update(source).digest("hex");

    expect(digest).toBe(CURRENT_TERMS_HASH);
  });
});
