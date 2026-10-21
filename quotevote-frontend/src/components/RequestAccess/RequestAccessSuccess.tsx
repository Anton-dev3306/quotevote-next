"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FOCUS_RING_CLASS, PRIMARY_ACTION_CLASS } from "@/lib/constants/formControls";
import { cn } from "@/lib/utils";
import type { RequestAccessSuccessProps } from "@/types/components";

/**
 * Shown after an invite request goes through. Accounts are invite-only, so this
 * says what happens next instead of implying the visitor has already joined.
 */
export function RequestAccessSuccess({ email }: RequestAccessSuccessProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The form is gone, so move focus here for keyboard and screen reader users.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      aria-labelledby="request-access-success-title"
      data-testid="request-access-success"
      className="w-full max-w-lg rounded-2xl border border-border bg-card px-6 py-8 text-left text-card-foreground shadow-xl sm:px-8"
    >
      <CheckCircle2 className="size-10 text-[#2f7a4c] dark:text-[#7fdc9c]" aria-hidden="true" />
      <h1
        ref={headingRef}
        id="request-access-success-title"
        data-testid="invite-success-message"
        tabIndex={-1}
        className="mt-4 text-2xl! font-bold leading-tight! text-foreground focus:outline-none"
      >
        Request received
      </h1>
      <p className="mt-2 text-base text-foreground/80">
        Thanks for your interest in Quote.Vote.{" "}
        {email ? (
          <>
            We&apos;ll write to{" "}
            <span className="font-semibold text-foreground [overflow-wrap:anywhere]">{email}</span>{" "}
            once your request is approved.
          </>
        ) : (
          "We’ll email you once your request is approved."
        )}
      </p>

      <h2 className="mt-6 text-sm! font-semibold uppercase tracking-wide text-foreground/70">
        What happens next
      </h2>
      <ol className="mt-3 space-y-3 text-sm text-foreground/85">
        {[
          "Our team reviews your request.",
          "Once it’s approved, you’ll get an email with a link to set your password.",
          "Sign in with your email and new password.",
        ].map((step, index) => (
          <li key={step} className="flex gap-3">
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#2f7a4c]/10 text-xs font-semibold text-[#2f6f4a] dark:bg-[#7fdc9c]/15 dark:text-[#7fdc9c]"
            >
              {index + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-foreground/70">
        Don&apos;t see the email? Check your spam or promotions folder.
      </p>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" className={cn("min-h-10 px-5", FOCUS_RING_CLASS)}>
          <Link href="/">Explore Quote.Vote</Link>
        </Button>
        <Button asChild className={cn("min-h-10 px-5", PRIMARY_ACTION_CLASS, FOCUS_RING_CLASS)}>
          <Link href="/auths/login">Go to sign in</Link>
        </Button>
      </div>
    </section>
  );
}
