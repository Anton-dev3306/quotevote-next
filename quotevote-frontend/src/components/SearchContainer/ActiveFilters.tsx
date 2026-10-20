'use client'

import { X } from 'lucide-react'
import type { ActiveFiltersProps } from '@/types/directory'

/**
 * The filters behind the current results, each removable on its own (#515).
 * With two or more, Clear all resets them in one go.
 */
export default function ActiveFilters({ filters, onClearAll }: ActiveFiltersProps) {
  const active = filters.filter((f) => f.value)

  if (active.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="active-filters">
      <span className="sr-only">Showing results for:</span>
      <ul className="contents" aria-label="Active filters">
        {active.map((filter) => (
          <li
            key={filter.key}
            className="inline-flex min-h-7 items-center gap-1 rounded-full border border-[#52b274]/40 bg-[#52b274]/10 py-0.5 pl-2.5 pr-0.5 text-xs font-medium text-[#2f6f4a] dark:text-[#7fdc9c]"
          >
            <span className="text-foreground/75">{filter.label}:</span>
            <span className="max-w-[14rem] truncate">{filter.value}</span>
            <button
              type="button"
              onClick={filter.onRemove}
              className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[#52b274]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52b274]"
              aria-label={`Remove ${filter.label} filter`}
            >
              <X className="size-3" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {onClearAll && active.length > 1 ? (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold text-foreground underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52b274]"
        >
          Clear all
        </button>
      ) : null}
    </div>
  )
}
