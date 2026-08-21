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

  return <><Header compact/><main className="page shell">
    <p className="eyebrow">// RIWAYAT AKUN</p>
    <div className="profile-head"><div><h1 className="page-title">{entity.displayName.toUpperCase()}</h1><p>{entity.description}</p></div><RiskBadge count={entity.reportCount}/></div>
    <section className="reputation-strip" aria-label="Ringkasan reputasi">
      <div><strong>{entity.successfulTransactionCount}</strong><span>TESTI TRANSAKSI LANCAR</span></div>
      <div><strong>{entity.reportCount}</strong><span>LAPORAN SUDAH DICEK</span></div>
      <Link className="tactical-button" href={`/entity/${entity.slug}/confirm`}>KASIH TESTI ↗</Link>
    </section>
    <section className="profile-grid">
      <div className="data-panel"><h2>NOMOR / AKUN TERKAIT</h2>{entity.identifiers.map((identifier,index)=><div className="identifier-row" key={index}><span>{labelIdentifierType(identifier.type)}</span><strong>{identifier.maskedValue}</strong></div>)}</div>
      <div className="data-panel"><h2>LAPORAN YANG SUDAH DICEK</h2>{entity.reports.length===0?<p className="panel-empty">Belum ada laporan yang lolos pengecekan admin.</p>:entity.reports.map((report)=><Link className="case-row" href={`/case/${report.publicId}`} key={report.publicId}><span>LAPORAN // {report.publicId}</span><strong>{report.title}</strong><p>{report.publicSummary}</p><small>UANG YANG DILAPORKAN HILANG · {formatRupiah(report.allegedLoss)}</small></Link>)}</div>
    </section>
    <section className="data-panel confirmation-panel"><div className="panel-heading"><div><p className="panel-index">// TESTI DARI KOMUNITAS</p><h2>PENGALAMAN TRANSAKSI</h2></div><span>{entity.successfulTransactionCount} TESTI TERBIT</span></div>
      {entity.confirmations.length===0?<p className="panel-empty">Belum ada testi transaksi dari pengguna lain.</p>:<div className="confirmation-list">{entity.confirmations.map((confirmation)=><article key={confirmation.id}><div><span>TRANSAKSI // {new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(confirmation.transactionDate))}</span><strong>{formatRupiah(confirmation.amount)}</strong></div><p>{confirmation.note}</p><small>Dikirim pengguna · Dicek moderator</small></article>)}</div>}
    </section>
    <Disclaimer/>
  </main><Footer/></>;
}
