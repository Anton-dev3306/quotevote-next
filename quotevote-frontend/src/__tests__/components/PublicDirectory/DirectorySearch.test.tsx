/**
 * Topic suggestions for the home search (#515).
 */
import { matchTopics } from "@/app/components/PublicDirectory/DirectorySearch";

const topics = [
  { _id: "1", title: "Climate" },
  { _id: "2", title: "Housing" },
  { _id: "3", title: "Local Climate Action" },
  { _id: "4", title: "QA" },
];

describe("matchTopics", () => {
  it("matches with or without a leading #, in any case", () => {
    expect(matchTopics("#cli", topics).map((t) => t.title)).toEqual([
      "Climate",
      "Local Climate Action",
    ]);
    expect(matchTopics("HOUS", topics).map((t) => t.title)).toEqual(["Housing"]);
  });

  it("puts topics that start with the text before ones that only contain it", () => {
    expect(matchTopics("climate", topics)[0].title).toBe("Climate");
  });

  it("lists topics for a lone #, and nothing for empty text", () => {
    expect(matchTopics("#", topics)).toHaveLength(4);
    expect(matchTopics("  ", topics)).toEqual([]);
  });

  it("shows at most six", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ _id: String(i), title: `Topic ${i}` }));
    expect(matchTopics("topic", many)).toHaveLength(6);
  });
});
