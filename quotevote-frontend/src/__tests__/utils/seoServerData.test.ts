/**
 * @jest-environment node
 */
import { getPostForMetadata, getSitemapPosts, getUserForMetadata } from "@/lib/seo/serverData";

describe("seo server data", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  const respond = (body: unknown, ok = true): void => {
    fetchMock.mockResolvedValueOnce({ ok, json: async () => body });
  };

  it("posts the post metadata query with variables", async () => {
    respond({ data: { post: { _id: "p1", title: "Hello" } } });

    await expect(getPostForMetadata("p1")).resolves.toEqual({ _id: "p1", title: "Hello" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { query: string; variables: unknown };
    expect(init.method).toBe("POST");
    expect(body.query).toContain("post(postId: $postId)");
    expect(body.variables).toEqual({ postId: "p1" });
  });

  it("returns null when the post does not exist", async () => {
    respond({ data: { post: null } });
    await expect(getPostForMetadata("missing")).resolves.toBeNull();
  });

  it("returns null on HTTP errors", async () => {
    respond({}, false);
    await expect(getUserForMetadata("jane")).resolves.toBeNull();
  });

  it("returns null when the request throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    await expect(getUserForMetadata("john")).resolves.toBeNull();
  });

  it("returns sitemap posts or an empty list", async () => {
    respond({ data: { posts: { entities: [{ url: "/post/g/t/1" }] } } });
    await expect(getSitemapPosts(10)).resolves.toEqual([{ url: "/post/g/t/1" }]);

    respond({ errors: [{ message: "boom" }] });
    await expect(getSitemapPosts(10)).resolves.toEqual([]);
  });
});
