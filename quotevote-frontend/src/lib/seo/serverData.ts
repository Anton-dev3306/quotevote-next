import { cache } from "react";
import { print } from "graphql";
import type { DocumentNode } from "graphql";
import { GET_POST_METADATA, GET_SITEMAP_POSTS, GET_USER_METADATA } from "@/graphql/queries";
import { getGraphqlServerUrl } from "@/lib/utils/getServerUrl";
import type {
  GraphqlResponse,
  PostMetadataData,
  SitemapPostData,
  UserMetadataData,
} from "@/types/seo";

// Page metadata blocks crawler responses, so keep it short; the sitemap regenerates in the background.
const METADATA_TIMEOUT_MS = 3000;
const SITEMAP_TIMEOUT_MS = 10000;
const REVALIDATE_SECONDS = 300;

// Metadata must never break a page render: any network/GraphQL failure resolves to null.
async function queryPublicGraphql<TData>(
  query: DocumentNode,
  variables: Record<string, unknown>,
  timeoutMs: number = METADATA_TIMEOUT_MS
): Promise<TData | null> {
  try {
    const response = await fetch(getGraphqlServerUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: print(query), variables }),
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;

    const json = (await response.json()) as GraphqlResponse<TData>;
    return json.data ?? null;
  } catch {
    return null;
  }
}

export const getPostForMetadata = cache(
  async (postId: string): Promise<PostMetadataData | null> => {
    const data = await queryPublicGraphql<{ post: PostMetadataData | null }>(GET_POST_METADATA, {
      postId,
    });
    return data?.post ?? null;
  }
);

export const getUserForMetadata = cache(
  async (username: string): Promise<UserMetadataData | null> => {
    const data = await queryPublicGraphql<{ user: UserMetadataData | null }>(GET_USER_METADATA, {
      username,
    });
    return data?.user ?? null;
  }
);

export async function getSitemapPosts(limit: number): Promise<SitemapPostData[]> {
  const data = await queryPublicGraphql<{ posts: { entities: SitemapPostData[] } | null }>(
    GET_SITEMAP_POSTS,
    { limit, offset: 0, searchKey: "" },
    SITEMAP_TIMEOUT_MS
  );
  return data?.posts?.entities ?? [];
}
