import type { Metadata } from "next";
import { getCommunityPosts } from "../../lib/api";
import { CommunityFeed } from "../components/CommunityFeed";
import { Footer, Header } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: "Community | Valrify",
  description: "Feed komunitas Valrify untuk berbagi pengalaman dan tips transaksi akun Valorant.",
};
export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const posts = await getCommunityPosts();
  return <><Header compact backHref="/" backLabel="Kembali ke beranda"/><main className="page shell community-page"><CommunityFeed initialPosts={posts}/></main><Footer/></>;
}
