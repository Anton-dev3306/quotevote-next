"use client";

import { useId, type ReactElement } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { DirectoryFiltersPanelProps, DirectorySort } from "@/types/directory";

const SORTS: Array<{ value: DirectorySort; label: string; hint: string }> = [
  { value: "latest", label: "Latest", hint: "Newest posts first" },
  { value: "popular", label: "Most popular", hint: "Most voted, quoted and discussed" },
];

const optionClass =
  "flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm text-foreground transition-colors hover:bg-muted/70 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#52b274]";
const radioClass =
  "size-4 shrink-0 cursor-pointer accent-[#2f7a4c] focus-visible:outline-none dark:accent-[#7fdc9c]";
const legendClass =
  "mb-1 px-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground";

/**
 * Everything that narrows or orders the results, in one place (#515): the
 * sort (Latest or Most popular), the Following feed and the topic. They all
 * change the same results the search shows.
 */
export function DirectoryFiltersPanel({
  sort,
  onSortChange,
  showFollowing,
  following,
  onFollowingChange,
  topics,
  topicId,
  onTopicChange,
  onClear,
  onDone,
}: DirectoryFiltersPanelProps): ReactElement {
  const name = useId();
  const followingId = useId();
  const anyActive = sort !== "latest" || following || !!topicId;

  return (
    <div data-testid="directory-filters-panel">
      <div className="max-h-[min(28rem,70dvh)] space-y-4 overflow-y-auto p-3">
        <fieldset>
          <legend className={legendClass}>Sort by</legend>
          {SORTS.map((option) => (
            <label key={option.value} className={optionClass}>
              <input
                type="radio"
                name={`${name}-sort`}
                value={option.value}
                checked={sort === option.value}
                onChange={() => onSortChange(option.value)}
                className={radioClass}
              />
              <span className="flex min-w-0 flex-col py-1.5">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {showFollowing ? (
          <fieldset>
            <legend className={legendClass}>Show</legend>
            <label htmlFor={followingId} className={optionClass}>
              <Checkbox
                id={followingId}
                checked={following}
                onCheckedChange={(checked) => onFollowingChange(checked === true)}
                className="border-[#8a8a93] data-[state=checked]:border-[#2f7a4c] data-[state=checked]:bg-[#2f7a4c] dark:border-[#6e7681]"
              />
              <span className="font-medium">Only people I follow</span>
            </label>
          </fieldset>
        ) : null}

        <fieldset>
          <legend className={legendClass}>Topic</legend>
          <label className={optionClass}>
            <input
              type="radio"
              name={`${name}-topic`}
              value=""
              checked={!topicId}
              onChange={() => onTopicChange("")}
              className={radioClass}
            />
            <span className="font-medium">Any topic</span>
          </label>
          {topics.map((topic) => (
            <label key={topic._id} className={optionClass}>
              <input
                type="radio"
                name={`${name}-topic`}
                value={topic._id}
                checked={topicId === topic._id}
                onChange={() => onTopicChange(topic._id)}
                className={radioClass}
              />
              <span className="truncate font-medium">#{topic.title}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border p-2.5">
        <button
          type="button"
          onClick={onClear}
          disabled={!anyActive}
          className={cn(
            "inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52b274]",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          )}
        >
          Clear filters
        </button>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex min-h-9 items-center rounded-md bg-[#2f7a4c] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#276640] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52b274] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Done
        </button>
      </div>
    </div>
  );
}
