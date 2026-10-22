import { postToActivity } from "@/lib/utils/postToActivity";
import type { Post } from "@/types/post";

const post: Post = {
  _id: "post-1",
  userId: "author-1",
  created: "2026-10-21T17:08:16.664Z",
  title: "A public post",
  text: "Careful reading before voting.",
  url: "/post/tag/a-public-post/post-1",
  upvotes: 3,
  downvotes: 1,
  bookmarkedBy: ["someone"],
  creator: { _id: "author-1", name: "Alice", username: "alice", avatar: null },
  votes: [{ _id: "v1", type: "up" }],
  comments: [{ _id: "c1", created: "2026-10-21T17:09:00.000Z", userId: "u2" }],
  quotes: [],
  messageRoom: null,
};

describe("postToActivity", () => {
  it("shows a post as a Posted activity by its author, with the card's counts", () => {
    expect(postToActivity(post)).toEqual({
      _id: "posted-post-1",
      created: post.created,
      postId: "post-1",
      userId: "author-1",
      user: { _id: "author-1", name: "Alice", username: "alice", avatar: undefined },
      activityType: "POSTED",
      content: "Careful reading before voting.",
      post: {
        _id: "post-1",
        title: "A public post",
        text: "Careful reading before voting.",
        url: "/post/tag/a-public-post/post-1",
        upvotes: 3,
        downvotes: 1,
        votes: [{ _id: "v1" }],
        quotes: [],
        comments: [{ _id: "c1" }],
        messageRoom: undefined,
        bookmarkedBy: ["someone"],
        created: post.created,
        creator: { _id: "author-1", name: "Alice", username: "alice", avatar: undefined },
      },
    });
  });

  it("fills safe defaults when the API leaves fields out", () => {
    const activity = postToActivity({ _id: "p2", userId: "u9", created: "2026-01-01T00:00:00.000Z" });
    expect(activity.user).toEqual({ _id: "u9", name: undefined, username: "", avatar: undefined });
    expect(activity.post).toMatchObject({
      text: "",
      url: "",
      upvotes: 0,
      downvotes: 0,
      votes: [],
      comments: [],
      quotes: [],
      bookmarkedBy: [],
    });
  });
});
