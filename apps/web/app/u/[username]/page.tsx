import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatRupiah } from "@valrify/domain";
import { getPublicMember } from "../../../lib/api";
import { Footer, Header } from "../../components/SiteChrome";

type PageProps = { params: Promise<{ username: string }> };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const member = await getPublicMember(username);
  if (!member) return { title: "Profil tidak ditemukan | Valrify" };
  return {
    title: `${member.displayName} (@${member.username}) | Valrify`,
    description: member.bio || `Lihat aktivitas publik ${member.displayName} di komunitas Valrify.`,
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const member = await getPublicMember(username);
  if (!member) notFound();
  const hasActivity = member.posts.length > 0 || member.reports.length > 0 || member.testimonials.length > 0;

  return <><Header compact backHref="/" backLabel="Kembali ke beranda"/><main className="page shell public-member-page">
    <section className="public-member-hero">
      <div className="public-member-avatar" aria-hidden="true">{member.displayName.slice(0, 1).toUpperCase()}</div>
      <div className="public-member-identity">
        <p className="eyebrow">// PROFIL KOMUNITAS</p>
        <h1>{member.displayName}</h1>
        <p className="public-member-handle">@{member.username}</p>
        <p className="public-member-bio">{member.bio || "Belum menambahkan bio."}</p>
        <div className="public-member-meta"><span data-role={member.role}>{member.roleLabel.toUpperCase()}</span><small>Bergabung {formatDate(member.joinedAt)}</small></div>
      </div>
    </section>

    <section className="public-member-stats" aria-label="Aktivitas publik">
      <article><span>POST KOMUNITAS</span><strong>{member.stats.posts}</strong><small>Obrolan publik</small></article>
      <article className="report"><span>SCAM REPORT PUBLIK</span><strong>{member.stats.reports}</strong><small>Hanya dari peran tepercaya</small></article>
      <article className="positive"><span>TESTI DISETUJUI</span><strong>{member.stats.testimonials}</strong><small>Aktivitas transaksi publik</small></article>
    </section>

    <section className="public-member-content">
      <div className="public-member-heading"><div><span>// AKTIVITAS PUBLIK</span><h2>JEJAK KOMUNITAS.</h2></div><p>Hanya aktivitas yang sudah diperiksa dan memang boleh dilihat publik yang muncul di sini.</p></div>
      {!hasActivity ? <div className="public-member-empty"><strong>BELUM ADA AKTIVITAS PUBLIK.</strong><p>Scam report user biasa tetap anonim. User ini belum menulis post atau testi publik.</p><Link href="/community" className="tactical-button">BUKA COMMUNITY</Link></div> : <div className="public-member-feed">
        {member.posts.map((post) => <article className="public-member-card community" key={`post-${post.id}`}>
          <div className="public-member-card-type"><span>POST KOMUNITAS</span><time>{formatDate(post.createdAt)}</time></div>
          <p className="public-member-post-body">{post.body}</p>
          <div className="public-member-card-footer"><span><small>AKTIVITAS PUBLIK</small><strong>BUKAN LAPORAN TERVERIFIKASI</strong></span><Link href={`/community/post/${post.id}`}>BUKA POST →</Link></div>
        </article>)}
        {member.reports.map((report) => <article className="public-member-card report" key={report.publicId}>
          <div className="public-member-card-type"><span>SCAM REPORT</span><time>{formatDate(report.publishedAt)}</time></div>
          <h3><Link href={`/case/${report.publicId}`}>{report.title}</Link></h3>
          <Link className="public-member-entity" href={`/entity/${report.entitySlug}`}><span>PROFIL TERKAIT</span><strong>{report.entityName}</strong><b aria-hidden="true">→</b></Link>
          <p>{report.publicSummary}</p>
          <div className="public-member-card-footer"><span><small>DILAPORKAN HILANG</small><strong>{formatRupiah(report.allegedLoss)}</strong></span><Link href={`/case/${report.publicId}`}>BACA REPORT →</Link></div>
        </article>)}
        {member.testimonials.map((item) => <article className="public-member-card testimonial" key={item.id}>
          <div className="public-member-card-type"><span>TESTI TRANSAKSI</span><time>{formatDate(item.transactionDate)}</time></div>
          <h3><Link href={`/entity/${item.entitySlug}`}>{item.entityName}</Link></h3>
          <p>{item.note}</p>
          <div className="public-member-card-footer"><span><small>NOMINAL TRANSAKSI</small><strong>{formatRupiah(item.amount)}</strong></span><Link href={`/entity/${item.entitySlug}`}>BUKA PROFIL →</Link></div>
        </article>)}
      </div>}
    </section>

    <aside className="public-member-privacy"><strong>PRIVASI TETAP DIJAGA.</strong><p>Email, bukti pribadi, laporan yang masih diproses, dan catatan admin tidak ditampilkan. Scam report dari anggota biasa juga tetap anonim.</p></aside>
  </main><Footer/></>;
}
