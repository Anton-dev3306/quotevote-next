import { parseApiDate } from "@/lib/utils/apiDate";

describe("parseApiDate", () => {
  it("reads milliseconds sent as text, which the live API does for String-typed dates", () => {
    expect(parseApiDate("1769904000000")?.toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });

  it("reads numbers, ISO strings and Dates", () => {
    expect(parseApiDate(1769904000000)?.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(parseApiDate("2026-02-01T00:00:00.000Z")?.getTime()).toBe(1769904000000);
    expect(parseApiDate(new Date(1769904000000))?.getTime()).toBe(1769904000000);
  });

  it("returns null for missing or unreadable values", () => {
    expect(parseApiDate(null)).toBeNull();
    expect(parseApiDate(undefined)).toBeNull();
    expect(parseApiDate("")).toBeNull();
    expect(parseApiDate("not a date")).toBeNull();
    expect(parseApiDate(new Date("nope"))).toBeNull();
  });
});
