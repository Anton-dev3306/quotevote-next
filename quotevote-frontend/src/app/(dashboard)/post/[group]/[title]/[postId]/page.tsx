import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  buildPageMetadata,
  decodeParam,
  pageTitle,
  toDescription,
  toIsoDate,
  SITE_NAME,
} from "@/lib/seo/metadata";
import { getPostForMetadata } from "@/lib/seo/serverData";
import { toAppPostUrl } from "@/lib/utils/sanitizeUrl";
import PostPageContent from "./PostPageContent";

interface PostPageProps {
  params: Promise<{ group: string; title: string; postId: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { group, title, postId } = await params;
  const post = await getPostForMetadata(decodeParam(postId));

  const postUrl = post?.url ? toAppPostUrl(post.url.trim()) : "";
  const path = postUrl.startsWith("/post/")
    ? postUrl
    : `/post/${[group, title, postId].map((s) => encodeURIComponent(decodeParam(s))).join("/")}`;

  // A missing or deleted post must not stay indexable; an API outage keeps the generic fallback.
  if (!post) {
    return buildPageMetadata({
      title: pageTitle("Post"),
      description: `Read this post and join the discussion on ${SITE_NAME}.`,
      path,
      type: "article",
      noIndex: post === null,
    });
  }

  const author = post.creator?.username ? `@${post.creator.username}` : null;
  const description = post.text?.trim()
    ? toDescription(post.text)
    : `A post${author ? ` by ${author}` : ""} on ${SITE_NAME}.`;

  return buildPageMetadata({
    title: pageTitle(post.title?.trim() || "Post"),
    description,
    path,
    type: "article",
    publishedTime: toIsoDate(post.created),
  });
}

export default function PostPage(): ReactNode {
  return <PostPageContent />;
}
