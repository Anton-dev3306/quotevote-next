/**
 * Shared control styling for the Edit Profile and Settings forms (#536).
 *
 * The default input border token (#e4e4e7) is about 1.2:1 on a white card, so
 * a field's edge is hard to see. These borders read at 3:1 or better in both
 * themes, and the focus state switches to a dark green border plus a ring.
 */
export const FORM_FIELD_CLASS =
  "border-[#8a8a93] dark:border-[#6e7681] focus-visible:border-[#2f7a4c] focus-visible:ring-[#52b274]/40 dark:focus-visible:border-[#7fdc9c]";

/** Visible keyboard focus for buttons and links on these pages. */
export const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52b274] focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** White on the brand green is 2.6:1; this darker green keeps button text readable (5.2:1). */
export const PRIMARY_ACTION_CLASS = "bg-[#2f7a4c] text-white hover:bg-[#276640]";
