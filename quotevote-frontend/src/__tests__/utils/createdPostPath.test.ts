import { getCreatedPostPath } from "@/lib/utils/createdPostPath";

describe("getCreatedPostPath", () => {
  it("returns the in-app path for a created post", () => {
    expect(getCreatedPostPath("/post/qa/my-title/6ad24aa0df282d003801fcd0")).toBe(
      "/post/qa/my-title/6ad24aa0df282d003801fcd0"
    );
  });

  it("strips query markers the same way other post links do", () => {
    expect(getCreatedPostPath("/post/qa/what?/123")).toBe("/post/qa/what/123");
  });

  it("trims surrounding whitespace", () => {
    expect(getCreatedPostPath("  /post/qa/title/1  ")).toBe("/post/qa/title/1");
  });

  it("returns null when there is no url", () => {
    expect(getCreatedPostPath(undefined)).toBeNull();
    expect(getCreatedPostPath(null)).toBeNull();
    expect(getCreatedPostPath("")).toBeNull();
  });

  it("refuses anything that isn't a same-app relative path", () => {
    expect(getCreatedPostPath("https://example.com/post/1")).toBeNull();
    expect(getCreatedPostPath("//evil.example/post/1")).toBeNull();
    expect(getCreatedPostPath("javascript:alert(1)")).toBeNull();
  });
});
