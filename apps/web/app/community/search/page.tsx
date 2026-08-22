import type { Metadata } from "next";
import Link from "next/link";
import { searchCommunity } from "../../../lib/api";
import { Footer, Header } from "../../components/SiteChrome";

type SearchTab = "posts" | "members";

export const metadata: Metadata = {
  title: "Cari di Community | Valrify",
  description: "Cari post dan anggota Community Valrify berdasarkan isi, nama, atau username.",
};
export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function roleLabel(role: string) {
  return ({ USER: "ANGGOTA", VERIFIED_MIDDLEMAN: "VERIFIED MIDDLEMAN", MODERATOR: "MODERATOR", ADMIN: "ADMIN" } as Record<string, string>)[role] ?? role;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const index = text.toLocaleLowerCase("id-ID").indexOf(query.toLocaleLowerCase("id-ID"));
  if (index < 0 || !query) return text;
  return <>{text.slice(0, index)}<mark>{text.slice(index, index + query.length)}</mark>{text.slice(index + query.length)}</>;
}

export default async function CommunitySearchPage({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const tab: SearchTab = params.tab === "members" ? "members" : "posts";
  const result = query.length >= 2 ? await searchCommunity(query) : { query, posts: [], members: [] };
  const activeCount = tab === "posts" ? result.posts.length : result.members.length;

  return <><Header compact backHref="/community" backLabel="Kembali ke Community"/><main className="page shell community-search-page">
    <section className="community-search-hero">
      <div><span>// COMMUNITY SEARCH</span><h1>CARI<br/><b>OBROLAN.</b></h1><p>Temukan post dari isi pembahasannya, atau cari anggota lewat nama dan username.</p></div>
      <aside><strong>PENCARIAN TERPISAH.</strong><p>Hasil di sini hanya aktivitas Community. Untuk mengecek rekening, nomor, atau data penipu, tetap gunakan menu Cek.</p><Link href="/search">CEK DATA PENIPU →</Link></aside>
    </section>

    <form action="/community/search" className="community-search-form">
      <label htmlFor="community-search-q">CARI POST ATAU ANGGOTA</label>
      <div><input id="community-search-q" name="q" defaultValue={query} minLength={2} maxLength={80} required placeholder="Contoh: rekber, recovery, user_tester..." autoFocus/><button type="submit">CARI →</button></div>
      <small>Minimal 2 karakter · tidak mencari rekening atau laporan scam</small>
    </form>

    {!query && <section className="community-search-start"><strong>MULAI DARI KATA KUNCI.</strong><p>Coba topik seperti “rekber”, “recovery”, atau nama anggota yang ingin kamu cari.</p><Link href="/community">LIHAT FEED TERBARU →</Link></section>}
    {query.length === 1 && <section className="community-search-start warning"><strong>KURANG SATU KARAKTER.</strong><p>Ketik minimal dua karakter supaya hasil pencarian lebih berguna.</p></section>}
    {query.length >= 2 && <>
      <nav className="community-search-tabs" aria-label="Jenis hasil pencarian">
        <Link href={`/community/search?q=${encodeURIComponent(query)}&tab=posts`} aria-current={tab === "posts" ? "page" : undefined}><span>POST</span><strong>{result.posts.length}</strong></Link>
        <Link href={`/community/search?q=${encodeURIComponent(query)}&tab=members`} aria-current={tab === "members" ? "page" : undefined}><span>ANGGOTA</span><strong>{result.members.length}</strong></Link>
      </nav>
      <div className="community-search-result-heading"><span>HASIL UNTUK</span><h2>“{query}”</h2><strong>{activeCount} DITEMUKAN</strong></div>

      {tab === "posts" && (result.posts.length ? <section className="community-search-posts" aria-label="Hasil post">
        {result.posts.map((post) => <article key={post.id}>
          <header><Link href={`/u/${post.authorUsername}`}><span>{post.authorDisplayName.slice(0, 1).toUpperCase()}</span><div><strong>{post.authorDisplayName}</strong><small>@{post.authorUsername}</small></div></Link><b data-role={post.authorRole}>{roleLabel(post.authorRole)}</b></header>
          <Link className="community-search-post-body" href={`/community/post/${post.id}`}><p><Highlight text={post.body} query={result.query}/></p><span>BUKA POST →</span></Link>
          <footer><time>{formatDate(post.createdAt)}</time><span>{post.likeCount} SUKA</span><span>{post.commentCount} BALASAN</span></footer>
        </article>)}
      </section> : <section className="community-search-empty"><strong>POST-NYA BELUM KETEMU.</strong><p>Tidak ada post published yang memuat kata “{query}”. Coba kata yang lebih pendek atau cek tab Anggota.</p><Link href={`/community/search?q=${encodeURIComponent(query)}&tab=members`}>CARI DI ANGGOTA →</Link></section>)}

      {tab === "members" && (result.members.length ? <section className="community-search-members" aria-label="Hasil anggota">
        {result.members.map((member) => <Link href={`/u/${member.username}`} key={member.username}><span className="community-search-member-avatar">{member.displayName.slice(0, 1).toUpperCase()}</span><div><strong><Highlight text={member.displayName} query={result.query}/></strong><small>@<Highlight text={member.username} query={result.query}/></small><p>{member.bio || "Belum menambahkan bio."}</p></div><aside><b data-role={member.role}>{roleLabel(member.role)}</b><span>{member.postCount} POST</span><em aria-hidden="true">→</em></aside></Link>)}
      </section> : <section className="community-search-empty"><strong>ANGGOTANYA BELUM KETEMU.</strong><p>Tidak ada nama atau username publik yang cocok dengan “{query}”.</p><Link href={`/community/search?q=${encodeURIComponent(query)}&tab=posts`}>CARI DI POST →</Link></section>)}
    </>}
  </main><Footer/></>;
}
