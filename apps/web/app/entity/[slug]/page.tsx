import { ArrowIcon } from "../../components/ArrowIcon";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { labelIdentifierType } from "@valrify/domain";
import { Disclaimer, Footer, Header } from "../../components/SiteChrome";
import { RiskBadge } from "../../components/RiskBadge";
import { getEntity } from "../../../lib/api";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entity = await getEntity(slug);
  if (!entity) return { title: "Profil tidak ditemukan" };
  const description = `Profil reputasi ${entity.displayName} dengan ${entity.reportCount} laporan yang ditampilkan.`;
  return { title: entity.displayName, description, openGraph: { title: `${entity.displayName} — Valrify`, description, images: [] }, twitter: { card: "summary", title: `${entity.displayName} — Valrify`, description, images: [] } };
}

export default async function EntityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entity = await getEntity(slug);
  if (!entity) notFound();

  return <><Header compact backHref="/search" backLabel="Kembali ke pencarian"/><main className="page shell">
    <p className="section-label eyebrow">// RIWAYAT AKUN</p>
    <div className="profile-head"><div><h1 className="page-title">{entity.displayName}</h1><p>{entity.description}</p></div><RiskBadge count={entity.reportCount}/></div>
    <section className="reputation-strip" aria-label="Ringkasan reputasi">
      <div><strong>{entity.reportCount}</strong><span>LAPORAN SUDAH DICEK</span></div>
    </section>
    <section className="profile-grid">
      <div className="data-panel"><h2>IDENTITAS & AKUN TERKAIT</h2><p className="publication-note">Nama seller dipakai sebagai nama profil utama. Nama lain, nomor, dan akun di bawah berasal dari laporan yang ditampilkan.</p>{entity.aliases.map((identifier,index)=><div className="identifier-row" key={`alias-${index}`}><span>{labelIdentifierType(identifier.type)}</span><strong>{identifier.displayValue}</strong></div>)}{entity.identifiers.map((identifier,index)=><div className="identifier-row" key={`account-${index}`}><span>{labelIdentifierType(identifier.type)}</span><strong>{identifier.displayValue}</strong></div>)}</div>
      <div className="data-panel"><h2>LAPORAN DITAMPILKAN</h2>{entity.reports.length===0?<p className="panel-empty">Belum ada laporan yang ditampilkan.</p>:entity.reports.map((report)=><Link className="case-row" href={`/case/${report.publicId}`} aria-label={`Baca laporan ${report.title}`} key={report.publicId}><span>LAPORAN // {report.publicId}</span><strong>{report.title}</strong><div className="uploader-inline" data-role={report.uploadedBy.role}><span className="uploader-copy"><span>DIKIRIM OLEH</span><strong>{report.uploadedBy.displayName}</strong></span><em>{report.uploadedBy.roleLabel}</em></div><p>{report.publicSummary}</p><span className="case-row-cta">BACA LAPORAN <span aria-hidden="true"><ArrowIcon/></span></span></Link>)}</div>
    </section>
    <Disclaimer/>
  </main><Footer/></>;
}
