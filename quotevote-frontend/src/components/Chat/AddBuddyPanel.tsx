"use client";

import type { FC } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import UserSearchResults from "./UserSearchResults";
import type { AddBuddyPanelProps } from "@/types/chat";

/**
 * Finding people to add as buddies (#531). It has its own labelled field, so the
 * conversation search above the tabs only ever searches conversations.
 */
const AddBuddyPanel: FC<AddBuddyPanelProps> = ({ onBack }) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();
  const hintId = useId();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <section
      aria-labelledby={`${inputId}-title`}
      className="flex flex-1 flex-col overflow-hidden"
      data-testid="add-buddy-panel"
    >
      <div className="flex items-center gap-2 border-b bg-background px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to buddies"
          className="inline-flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52b274]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h3 id={`${inputId}-title`} className="text-sm! leading-5! font-semibold text-foreground">
          Add a buddy
        </h3>
      </div>

      <div className="border-b bg-background px-4 py-3">
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-foreground">
          Find people
        </label>
        <div className="flex min-h-10 items-center rounded-xl border border-[#8a8a93] bg-background px-2.5 shadow-sm transition-colors focus-within:border-[#2f7a4c] focus-within:ring-2 focus-within:ring-[#52b274]/40 dark:border-[#6e7681] dark:focus-within:border-[#7fdc9c]">
          <Search className="mr-1.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={inputRef}
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or username"
            aria-describedby={hintId}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="h-9 flex-1 border-0 bg-transparent px-1 py-0 text-base shadow-none focus-visible:ring-0 md:text-sm dark:bg-transparent [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear"
              className="-mr-1 ml-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52b274]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p id={hintId} className="mt-1.5 text-xs text-muted-foreground">
          They get a buddy request, and join your Buddies list once they accept.
        </p>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-muted/40">
        <UserSearchResults searchQuery={query.trim()} />
      </div>
    </section>
  );
};

export default AddBuddyPanel;
