/**
 * Dates from the API come in more than one shape. The live API types fields
 * like `User.joined`, `User.lastBotReportDate` and `UserReport.createdAt` as
 * `String`, so it sends milliseconds as text ("1792518345208"), which moment
 * and `new Date()` read as an invalid date. The `Date` scalar and the new
 * backend send numbers or ISO strings. This turns any of them into a Date.
 */
export function parseApiDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date =
    typeof value === "number" || /^-?\d+$/.test(value.trim())
      ? new Date(Number(value))
      : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
