import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCommunityComments, getCommunityPost } from "../../../../lib/api";
import { CommunityPostDetail } from "../../../components/CommunityPostDetail";
import { Footer, Header } from "../../../components/SiteChrome";

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getCommunityPost(Number(id));
  if (!post) return { title: "Post Community tidak ditemukan | Valrify" };
  const description = post.body.length > 155 ? `${post.body.slice(0, 152)}...` : post.body;
  return {
    title: `Post @${post.authorUsername} | Community Valrify`,
    description,
    openGraph: { title: `Post @${post.authorUsername} di Community Valrify`, description },
    twitter: { card: "summary", title: `Post @${post.authorUsername} di Community Valrify`, description },
  };
}

export default async function CommunityPostPage({ params }: PageProps) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId) || postId < 1) notFound();
  const [post, comments] = await Promise.all([getCommunityPost(postId), getCommunityComments(postId)]);
  if (!post) notFound();
  return <><Header compact backHref="/community" backLabel="Kembali ke Community"/><main className="page shell community-post-detail-page"><CommunityPostDetail initialPost={post} initialComments={comments}/></main><Footer/></>;
}
