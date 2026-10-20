"use client";

import type { FC, FormEvent } from 'react';
import { useEffect, useId, useRef } from 'react';
import { Search, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import type { ChatSearchInputProps } from '@/types/chat';

/**
 * Search for the Messages panel (#531). Only search lives here: Add Buddy has its
 * own button and panel, so typing never switches what the box is searching.
 */
const ChatSearchInput: FC<ChatSearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search messages, @people or #tags',
  ariaLabel = 'Search conversations',
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hintId = useId();

  // Escape in a non-empty field clears it and keeps the panel open. The drawer
  // listens for Escape on the document, so this listens on the window first.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const input = inputRef.current;
      if (event.key !== 'Escape' || !input?.value || document.activeElement !== input) return;
      event.stopPropagation();
      event.preventDefault();
      onChange('');
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onChange]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="w-full">
      <form
        role="search"
        onSubmit={handleSubmit}
        className="flex min-h-10 items-center rounded-xl border border-[#8a8a93] bg-background px-2.5 text-sm shadow-sm transition-colors focus-within:border-[#2f7a4c] focus-within:ring-2 focus-within:ring-[#52b274]/40 dark:border-[#6e7681] dark:focus-within:border-[#7fdc9c]"
      >
        <Search className="mr-1.5 h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />

        <Input
          ref={inputRef}
          type="search"
          className="h-9 flex-1 border-0 bg-transparent px-1 py-0 text-base shadow-none focus-visible:ring-0 md:text-sm dark:bg-transparent [&::-webkit-search-cancel-button]:hidden"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel}
          aria-describedby={hintId}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          data-testid="chat-search-input"
        />
        <span id={hintId} className="sr-only">
          Matches message text. Start with @ for a person or # for a tag.
        </span>

        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="-mr-1 ml-1 inline-flex size-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52b274]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>
    </div>
  );
};

export default ChatSearchInput;
