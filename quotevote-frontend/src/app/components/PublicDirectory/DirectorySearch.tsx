"use client";

import { useId, useMemo, useRef, useState, type ReactElement } from "react";
import { Hash, Search as SearchIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DirectorySearchProps, DirectoryTopic } from "@/types/directory";

const MAX_SUGGESTIONS = 6;

/** Topics whose title matches what's typed, with a leading # optional. Prefix matches first. */
export function matchTopics(input: string, topics: DirectoryTopic[]): DirectoryTopic[] {
  const raw = input.trim();
  const hashed = raw.startsWith("#");
  const term = (hashed ? raw.slice(1) : raw).toLowerCase();
  if (!term) return hashed ? topics.slice(0, MAX_SUGGESTIONS) : [];
  const prefix: DirectoryTopic[] = [];
  const inner: DirectoryTopic[] = [];
  topics.forEach((topic) => {
    const title = topic.title.toLowerCase();
    if (title.startsWith(term)) prefix.push(topic);
    else if (title.includes(term)) inner.push(topic);
  });
  return [...prefix, ...inner].slice(0, MAX_SUGGESTIONS);
}

/**
 * The home page search (#515): the main way into discovery. As you type, it
 * suggests matching topics; choosing one filters by that tag instead of
 * searching its name as text.
 */
export function DirectorySearch({
  value,
  onChange,
  onSubmit,
  topics,
  onSelectTopic,
}: DirectorySearchProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const hintId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const suggestions = useMemo(() => matchTopics(value, topics), [value, topics]);
  const expanded = open && suggestions.length > 0;
  const optionId = (i: number) => `${listId}-option-${i}`;

  const choose = (topic: DirectoryTopic) => {
    setOpen(false);
    setActive(-1);
    onSelectTopic(topic);
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (expanded && active >= 0) {
          choose(suggestions[active]);
          return;
        }
        setOpen(false);
        onSubmit(value);
      }}
    >
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search quotes, topics and sources
      </label>
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={inputRef}
          id={`${listId}-input`}
          data-testid="directory-search"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          aria-describedby={hintId}
          autoComplete="off"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && suggestions.length > 0) {
              e.preventDefault();
              setOpen(true);
              setActive((i) => (i + 1) % suggestions.length);
            } else if (e.key === "ArrowUp" && suggestions.length > 0) {
              e.preventDefault();
              setOpen(true);
              setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
            } else if (e.key === "Escape" && expanded) {
              e.preventDefault();
              setOpen(false);
              setActive(-1);
            }
          }}
          placeholder="Search quotes, topics and sources"
          className="h-11 w-full rounded-full border border-[#8a8a93] bg-background pl-10 pr-11 text-base text-foreground placeholder:text-muted-foreground focus:border-[#2f7a4c] focus:outline-none focus:ring-2 focus:ring-[#52b274]/40 md:text-sm dark:border-[#6e7681] dark:focus:border-[#7fdc9c] [&::-webkit-search-cancel-button]:hidden"
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onChange("");
              onSubmit("");
              inputRef.current?.focus();
            }}
            className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52b274]"
          >
            <X className="size-4" />
          </button>
        ) : null}
        <span id={hintId} className="sr-only">
          Type to search, or start with # to pick a topic.
        </span>

        {expanded ? (
          <ul
            id={listId}
            role="listbox"
            aria-label="Topics"
            data-testid="directory-search-suggestions"
            className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-lg"
          >
            <li
              role="presentation"
              className="px-3.5 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Topics
            </li>
            {suggestions.map((topic, i) => (
              <li
                key={topic._id}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                // Keep focus in the box so a click doesn't blur and close the list first.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(topic)}
                onMouseMove={() => setActive(i)}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-2 px-3.5 text-sm text-foreground",
                  i === active && "bg-[#52b274]/12 text-[#2f6f4a] dark:text-[#7fdc9c]"
                )}
              >
                <Hash className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate">{topic.title}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  Filter by topic
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </form>
  );
}
