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
    description: member.bio || `Lihat profil reputasi publik ${member.displayName} di Valrify.`,
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const member = await getPublicMember(username);
  if (!member) notFound();
  const hasActivity = member.reports.length > 0 || member.testimonials.length > 0;

  return <><Header compact backHref="/" backLabel="Kembali ke beranda"/><main className="page shell public-member-page">
    <section className="public-member-hero">
      <div className="public-member-avatar" aria-hidden="true">{member.displayName.slice(0, 1).toUpperCase()}</div>
      <div className="public-member-identity">
        <p className="eyebrow">// PROFIL REPUTASI</p>
        <h1>{member.displayName}</h1>
        <p className="public-member-handle">@{member.username}</p>
        <p className="public-member-bio">{member.bio || "Belum menambahkan bio."}</p>
        <div className="public-member-meta"><span data-role={member.role}>{member.roleLabel.toUpperCase()}</span><small>Bergabung {formatDate(member.joinedAt)}</small></div>
      </div>
    </section>

    <section className="public-member-stats reputation-only" aria-label="Aktivitas publik">
      <article className="report"><span>LAPORAN DITAMPILKAN</span><strong>{member.stats.reports}</strong><small>Dikirim admin, moderator, atau rekber terverifikasi</small></article>
      <article className="positive"><span>TESTI DISETUJUI</span><strong>{member.stats.testimonials}</strong><small>Aktivitas transaksi publik</small></article>
    </section>

    <section className="public-member-content">
      <div className="public-member-heading"><div><span>// YANG BISA DILIHAT</span><h2>JEJAK REPUTASI.</h2></div><p>Bagian ini menampilkan laporan yang dikirim admin, moderator, atau rekber terverifikasi, serta testi yang dikirim pengguna.</p></div>
      {!hasActivity ? <div className="public-member-empty"><strong>BELUM ADA RIWAYAT.</strong><p>Laporan dari pengguna biasa tidak mencantumkan nama pengirim. Profil ini juga belum memiliki testi yang ditampilkan.</p><Link href="/search" className="tactical-button">CEK DATA LAIN</Link></div> : <div className="public-member-feed">
        {member.reports.map((report) => <article className="public-member-card report" key={report.publicId}>
          <div className="public-member-card-type"><span>SCAM REPORT</span><time>{formatDate(report.publishedAt)}</time></div>
          <h3><Link href={`/case/${report.publicId}`}>{report.title}</Link></h3>
          <Link className="public-member-entity" href={`/entity/${report.entitySlug}`}><span>PROFIL TERKAIT</span><strong>{report.entityName}</strong><b aria-hidden="true">→</b></Link>
          <p>{report.publicSummary}</p>
          <div className="public-member-card-footer"><Link href={`/case/${report.publicId}`}>BACA LAPORAN →</Link></div>
        </article>)}
        {member.testimonials.map((item) => <article className="public-member-card testimonial" key={item.id}>
          <div className="public-member-card-type"><span>TESTI TRANSAKSI</span><time>{formatDate(item.transactionDate)}</time></div>
          <h3><Link href={`/entity/${item.entitySlug}`}>{item.entityName}</Link></h3>
          <p>{item.note}</p>
          <div className="public-member-card-footer"><span><small>NOMINAL TRANSAKSI</small><strong>{formatRupiah(item.amount)}</strong></span><Link href={`/entity/${item.entitySlug}`}>BUKA PROFIL →</Link></div>
        </article>)}
      </div>}
    </section>

    <aside className="public-member-privacy"><strong>DATA PRIBADI TETAP DIJAGA.</strong><p>Email, bukti, laporan yang masih diproses, dan catatan admin tidak ditampilkan. Laporan dari pengguna biasa juga tidak mencantumkan nama pengirim.</p></aside>
  </main><Footer/></>;
}
