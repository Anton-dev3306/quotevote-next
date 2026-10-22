"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/context/AuthModalContext";
import { FOCUS_RING_CLASS, PRIMARY_ACTION_CLASS } from "@/lib/constants/formControls";
import { cn } from "@/lib/utils";
import type { ProfileActivitySignInProps } from "@/types/profile";

/**
 * Shown to signed-out visitors above a profile's activity while the live API only
 * returns posts to them. Says where the rest of the activity is.
 */
export function ProfileActivitySignIn({ displayName }: ProfileActivitySignInProps) {
  const { openAuthModal } = useAuthModal();

  return (
    <aside
      aria-label="More activity for members"
      data-testid="activity-signin"
      className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2 text-sm text-foreground/80">
        <Lock className="mt-0.5 size-4 shrink-0 text-foreground/70" aria-hidden="true" />
        <span>
          Showing {displayName}&apos;s posts. Sign in to see their votes, comments and quotes too.
        </span>
      </p>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => openAuthModal({ view: "login" })}
          className={cn("min-h-9 px-4", PRIMARY_ACTION_CLASS, FOCUS_RING_CLASS)}
        >
          Sign in
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          className={cn("min-h-9 px-4", FOCUS_RING_CLASS)}
        >
          <Link href="/auths/request-access">Request an invite</Link>
        </Button>
      </div>
    </aside>
  );
}
