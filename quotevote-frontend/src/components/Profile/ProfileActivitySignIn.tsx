"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/context/AuthModalContext";
import { FOCUS_RING_CLASS, PRIMARY_ACTION_CLASS } from "@/lib/constants/formControls";
import { cn } from "@/lib/utils";
import type { ProfileActivitySignInProps } from "@/types/profile";

/**
 * Shown to signed-out visitors in place of a profile's activity (#606). The live
 * API only returns activity to members, so asking for it would always fail.
 */
export function ProfileActivitySignIn({ displayName }: ProfileActivitySignInProps) {
  const { openAuthModal } = useAuthModal();

  return (
    <section
      aria-labelledby="profile-activity-signin-title"
      data-testid="activity-signin"
      className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-card px-6 py-10 text-center"
    >
      <Lock className="size-8 text-foreground/70" aria-hidden="true" />
      <h2 id="profile-activity-signin-title" className="text-base! font-semibold">
        Sign in to see {displayName}&apos;s activity
      </h2>
      <p className="max-w-sm text-sm text-foreground/75">
        Posts, votes, comments and quotes are visible to members. Quote.Vote is invite-only, so new
        members start by requesting an invite.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          onClick={() => openAuthModal({ view: "login" })}
          className={cn("min-h-10 px-5", PRIMARY_ACTION_CLASS, FOCUS_RING_CLASS)}
        >
          Sign in
        </Button>
        <Button asChild variant="outline" className={cn("min-h-10 px-5", FOCUS_RING_CLASS)}>
          <Link href="/auths/request-access">Request an invite</Link>
        </Button>
      </div>
    </section>
  );
}
