"use client";

import { Check } from "lucide-react";
import type { ProfileBackgroundPickerProps } from "@/types/profile";
import {
  getProfileBackgroundStyle,
  PROFILE_BG_COLORS,
  PROFILE_BG_PATTERNS,
} from "@/lib/utils/profileBackground";
import { FOCUS_RING_CLASS } from "@/lib/constants/formControls";
import { cn } from "@/lib/utils";

/**
 * Banner color and pattern for the profile cover (#536: lives in Edit Profile).
 * Controlled, so the page can preview a change and only keep it on Save.
 */
export function ProfileBackgroundPicker({
  color,
  pattern,
  onColorChange,
  onPatternChange,
}: ProfileBackgroundPickerProps) {
  const isPreset = PROFILE_BG_COLORS.some((c) => c.toLowerCase() === color.toLowerCase());

  return (
    <div className="space-y-4">
      <div
        className="h-20 w-full rounded-md border border-border"
        style={getProfileBackgroundStyle(color, pattern)}
        aria-label="Banner preview"
        role="img"
        data-testid="banner-preview"
      />

      <div className="space-y-2">
        <p id="banner-color-label" className="text-sm font-medium">
          Color
        </p>
        <div
          role="group"
          aria-labelledby="banner-color-label"
          className="flex flex-wrap items-center gap-2.5"
        >
          {PROFILE_BG_COLORS.map((c) => {
            const selected = color.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => onColorChange(c)}
                aria-label={`Banner color ${c}`}
                aria-pressed={selected}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-full border border-black/15 transition-transform hover:scale-110 motion-reduce:hover:scale-100 dark:border-white/20",
                  FOCUS_RING_CLASS,
                  selected && "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                )}
                style={{ backgroundColor: c }}
              >
                {selected && <Check className="size-4 text-white drop-shadow" aria-hidden="true" />}
              </button>
            );
          })}
          <label
            className={cn(
              "ml-1 inline-flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-1 text-sm text-foreground/80",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#52b274]",
              !isPreset && "font-semibold text-foreground"
            )}
          >
            <span>Custom</span>
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              aria-label="Custom banner color"
              className={cn(
                "h-8 w-10 cursor-pointer rounded border border-[#8a8a93] bg-transparent p-0.5 outline-none dark:border-[#6e7681]",
                !isPreset && "ring-2 ring-foreground ring-offset-2 ring-offset-card"
              )}
            />
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <p id="banner-pattern-label" className="text-sm font-medium">
          Pattern
        </p>
        <div role="group" aria-labelledby="banner-pattern-label" className="flex flex-wrap gap-2">
          {PROFILE_BG_PATTERNS.map((p) => {
            const selected = pattern === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => onPatternChange(p.value)}
                aria-pressed={selected}
                className={cn(
                  "inline-flex min-h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors",
                  FOCUS_RING_CLASS,
                  selected
                    ? "border-[#2f7a4c] bg-[#2f7a4c]/10 text-[#2f6f4a] dark:border-[#7fdc9c] dark:bg-[#7fdc9c]/10 dark:text-[#7fdc9c]"
                    : "border-border text-foreground/80 hover:bg-muted hover:text-foreground"
                )}
              >
                {selected && <Check className="size-3.5" aria-hidden="true" />}
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
