import {
  buildPassageActivity,
  describePassageActivity,
  passageActivityTotal,
} from "@/lib/utils/passageActivity";
import type { PassageActivitySegment } from "@/types/voting";

const TEXT = "Downtown parking is free on weekdays after six. Charging for it would help.";

const segment = (overrides: Partial<PassageActivitySegment> = {}): PassageActivitySegment => ({
  start: 0,
  end: 5,
  upvotes: 0,
  downvotes: 0,
  quotes: 0,
  comments: 0,
  actionIds: [],
  ...overrides,
});

describe("buildPassageActivity", () => {
  it("returns nothing for a post without passage activity", () => {
    expect(buildPassageActivity(TEXT, {})).toEqual([]);
    expect(buildPassageActivity(TEXT, { votes: null, quotes: null, comments: null })).toEqual([]);
  });

  it("counts votes by type, quotes and comments on the same passage", () => {
    const [only] = buildPassageActivity(TEXT, {
      votes: [
        { _id: "v1", startWordIndex: 0, endWordIndex: 16, type: "up" },
        { _id: "v2", startWordIndex: 0, endWordIndex: 16, type: "down" },
      ],
      quotes: [{ _id: "q1", startWordIndex: 0, endWordIndex: 16 }],
      comments: [{ _id: "c1", startWordIndex: 0, endWordIndex: 16 }],
    });
    expect(only).toMatchObject({
      start: 0,
      end: 16,
      upvotes: 1,
      downvotes: 1,
      quotes: 1,
      comments: 1,
    });
  });

  it("merges overlapping and touching ranges into one segment", () => {
    const segments = buildPassageActivity(TEXT, {
      votes: [
        { _id: "v1", startWordIndex: 0, endWordIndex: 10, type: "up" },
        { _id: "v2", startWordIndex: 5, endWordIndex: 20, type: "up" },
      ],
      comments: [{ _id: "c1", startWordIndex: 20, endWordIndex: 30 }],
      quotes: [{ _id: "q1", startWordIndex: 48, endWordIndex: 60 }],
    });
    expect(segments.map(({ start, end }) => [start, end])).toEqual([
      [0, 30],
      [48, 60],
    ]);
    expect(segments[0]).toMatchObject({ upvotes: 2, comments: 1 });
    expect(segments[1]).toMatchObject({ quotes: 1 });
  });

  it("clamps ranges to the text and drops empty or missing ones", () => {
    const segments = buildPassageActivity(TEXT, {
      votes: [
        { _id: "v1", startWordIndex: 60, endWordIndex: 999, type: "up" },
        { _id: "v2", startWordIndex: 5, endWordIndex: 5, type: "up" },
        { _id: "v3", startWordIndex: 999, endWordIndex: 1200, type: "up" },
      ],
      comments: [
        { _id: "c1", startWordIndex: null, endWordIndex: 10 },
        { _id: "c2", startWordIndex: 0, endWordIndex: 0 },
      ],
    });
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ start: 60, end: TEXT.length, actionIds: ["v1"] });
  });

  it("lists action ids newest first, reading the API's millisecond strings", () => {
    const [only] = buildPassageActivity(TEXT, {
      votes: [{ _id: "old", startWordIndex: 0, endWordIndex: 8, created: "1769904000000" }],
      comments: [
        { _id: "new", startWordIndex: 2, endWordIndex: 8, created: "2026-03-01T00:00:00.000Z" },
      ],
      quotes: [{ _id: "undated", startWordIndex: 4, endWordIndex: 8 }],
    });
    expect(only.actionIds).toEqual(["new", "old", "undated"]);
  });
});

describe("describePassageActivity", () => {
  it("names each kind with the right plural", () => {
    expect(describePassageActivity(segment({ upvotes: 1 }))).toBe("1 vote");
    expect(describePassageActivity(segment({ upvotes: 1, downvotes: 1, comments: 1 }))).toBe(
      "2 votes and 1 comment"
    );
    expect(describePassageActivity(segment({ upvotes: 3, quotes: 2, comments: 1 }))).toBe(
      "3 votes, 2 quotes and 1 comment"
    );
    expect(describePassageActivity(segment())).toBe("");
  });
});

describe("passageActivityTotal", () => {
  it("adds every kind of activity", () => {
    expect(
      passageActivityTotal(segment({ upvotes: 2, downvotes: 1, quotes: 1, comments: 3 }))
    ).toBe(7);
  });
});
