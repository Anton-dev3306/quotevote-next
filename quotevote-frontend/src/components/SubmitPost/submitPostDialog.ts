/**
 * Shared DialogContent classes for Create Quote across all hosts.
 * Mobile: edge-to-edge sheet. Desktop: tall centered dialog (85% of the viewport,
 * capped at 860px) and wide enough for comfortable writing.
 * Keep height utilities simple — complex min()/calc() arbitrary values can fail to emit.
 */
export const SUBMIT_POST_DIALOG_CLASS =
  'z-[70] flex flex-col gap-0 overflow-hidden p-0 ' +
  'inset-0 top-0 left-0 h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 ' +
  'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[85dvh] sm:max-h-[860px] sm:w-full sm:max-w-2xl ' +
  'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border'
