import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatRupiah, labelIdentifierType } from "@valrify/domain";
import { Disclaimer, Footer, Header } from "../../components/SiteChrome";
import { RiskBadge } from "../../components/RiskBadge";
import { getEntity } from "../../../lib/api";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entity = await getEntity(slug);
  if (!entity) return { title: "Profil tidak ditemukan" };
  const description = `Profil komunitas ${entity.displayName} dengan ${entity.reportCount} laporan terverifikasi dan ${entity.successfulTransactionCount} testi transaksi lancar.`;
  return { title: entity.displayName, description, openGraph: { title: `${entity.displayName} — Valrify`, description, images: [] }, twitter: { card: "summary", title: `${entity.displayName} — Valrify`, description, images: [] } };
}

export default async function EntityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entity = await getEntity(slug);
  if (!entity) notFound();

  return <><Header compact backHref="/search" backLabel="Kembali ke pencarian"/><main className="page shell">
    <p className="eyebrow">// RIWAYAT AKUN</p>
    <div className="profile-head"><div><h1 className="page-title">{entity.displayName.toUpperCase()}</h1><p>{entity.description}</p></div><RiskBadge count={entity.reportCount}/></div>
    <section className="reputation-strip" aria-label="Ringkasan reputasi">
      <div><strong>{entity.successfulTransactionCount}</strong><span>TESTI TRANSAKSI LANCAR</span></div>
      <div><strong>{entity.reportCount}</strong><span>SCAM REPORT SUDAH DICEK</span></div>
      <Link className="tactical-button" href={`/entity/${entity.slug}/confirm`}>KASIH TESTI ↗</Link>
    </section>
    <section className="profile-grid">
      <div className="data-panel"><h2>IDENTITAS & AKUN TERKAIT</h2><p className="publication-note">Nama seller adalah nama profil utama. Alias dan data di bawah berasal dari laporan yang sudah diperiksa admin.</p>{entity.aliases.map((identifier,index)=><div className="identifier-row" key={`alias-${index}`}><span>{labelIdentifierType(identifier.type)}</span><strong>{identifier.displayValue}</strong></div>)}{entity.identifiers.map((identifier,index)=><div className="identifier-row" key={`account-${index}`}><span>{labelIdentifierType(identifier.type)}</span><strong>{identifier.displayValue}</strong></div>)}</div>
      <div className="data-panel"><h2>SCAM REPORT YANG SUDAH DICEK</h2>{entity.reports.length===0?<p className="panel-empty">Belum ada scam report yang lolos pengecekan admin.</p>:entity.reports.map((report)=><Link className="case-row" href={`/case/${report.publicId}`} aria-label={`Baca scam report ${report.title}`} key={report.publicId}><span>SCAM REPORT // {report.publicId}</span><strong>{report.title}</strong><div className="uploader-inline" data-role={report.uploadedBy.role}><span className="uploader-copy"><span>DIUPLOAD OLEH</span><strong>{report.uploadedBy.displayName}</strong></span><em>{report.uploadedBy.roleLabel}</em></div><p>{report.publicSummary}</p><small>UANG YANG DILAPORKAN HILANG · {formatRupiah(report.allegedLoss)}</small><span className="case-row-cta">BACA LAPORAN <span aria-hidden="true">↗</span></span></Link>)}</div>
    </section>
    <section className="data-panel confirmation-panel"><div className="panel-heading"><div><p className="panel-index">// TESTI DARI KOMUNITAS</p><h2>PENGALAMAN TRANSAKSI</h2></div><span>{entity.successfulTransactionCount} TESTI TERBIT</span></div>
      {entity.confirmations.length===0?<p className="panel-empty">Belum ada testi transaksi dari pengguna lain.</p>:<div className="confirmation-list">{entity.confirmations.map((confirmation)=><article key={confirmation.id}><div><span>TRANSAKSI // {new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(confirmation.transactionDate))}</span><strong>{formatRupiah(confirmation.amount)}</strong></div><p>{confirmation.note}</p><small>Dikirim pengguna · Dicek moderator</small></article>)}</div>}
    </section>
    <Disclaimer/>
  </main><Footer/></>;
}
