import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CURRENT_TERMS_VERSION } from "@/lib/legal/termsPolicy";

export const metadata: Metadata = {
  title: "Terms of Service - Quote.Vote",
  description: "Terms for accounts, content, discussion, moderation, and copyright on Quote.Vote.",
};

function loadTermsParagraphs(): string[] {
  const sourcePath = join(process.cwd(), "src/lib/legal/termsSource.txt");
  const source = readFileSync(sourcePath, "utf8").trimEnd();
  return source.split(/\n\n+/).filter((paragraph) => paragraph.length > 0);
}

export default function TermsPage() {
  const paragraphs = loadTermsParagraphs();

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <article className="space-y-5 text-base text-foreground">
        <p className="text-sm text-muted-foreground" data-testid="terms-version">
          Terms version <span className="font-medium text-foreground">{CURRENT_TERMS_VERSION}</span>
        </p>
        {paragraphs.map((paragraph, index) => {
          if (index === 0) {
            return (
              <h1 key={index} className="text-3xl font-bold tracking-tight sm:text-4xl">
                {paragraph}
              </h1>
            );
          }
          if (/^\d+\.\s/.test(paragraph) || paragraph.startsWith("Welcome")) {
            return (
              <h2 key={index} className="pt-6 text-xl font-semibold tracking-tight">
                {paragraph}
              </h2>
            );
          }
          return (
            <p key={index} className="leading-7 whitespace-pre-wrap">
              {paragraph}
            </p>
          );
        })}
      </article>
    </main>
  );
}
