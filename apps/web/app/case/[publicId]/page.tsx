import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatIndonesianDate, formatRupiah, labelIdentifierType } from "@valrify/domain";
import { Disclaimer, Footer, Header } from "../../components/SiteChrome";
import { EvidenceGallery } from "../../components/EvidenceGallery";
import { getPublicCase } from "../../../lib/api";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ publicId: string }> }): Promise<Metadata> {
  const { publicId } = await params;
  const report = await getPublicCase(publicId);
  if (!report) return { title: "Scam report tidak ditemukan" };
  const description = String(report.publicSummary);
  return {
    title: `Case ${report.publicId}`,
    description,
    openGraph: { title: `Case ${report.publicId} — Valrify`, description, images: [] },
    twitter: { card: "summary", title: `Case ${report.publicId} — Valrify`, description, images: [] },
  };
}

export default async function CasePage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const report = await getPublicCase(publicId);
  if (!report) notFound();

  return <><Header compact backHref={`/entity/${report.slug}`} backLabel="Kembali ke profil"/><main className="page shell">
    <div className="case-heading"><div><p className="eyebrow">SCAM REPORT // {report.publicId}</p><h1 className="page-title">{report.title.toUpperCase()}</h1><div className="uploader-line" data-role={report.uploadedBy.role}><span className="uploader-copy"><span>DIUPLOAD OLEH</span><strong>{report.uploadedBy.displayName}</strong></span><em title="Role akun pengunggah; laporan tetap dinilai dari hasil review dan bukti.">{report.uploadedBy.roleLabel}</em></div></div><span className="status-badge">SUDAH DICEK ADMIN</span></div>
    <section className="case-layout">
      <article className="case-body"><p className="panel-index">CERITA SINGKAT</p><p className="summary">{report.publicSummary}</p><p className="source-line">DIKIRIM PENGGUNA · NAMA PELAPOR DISEMBUNYIKAN</p></article>
      <aside className="case-facts"><div><span>STATUS</span><strong>PUBLISHED</strong></div><div><span>TANGGAL KEJADIAN</span><strong>{formatIndonesianDate(report.transactionDate)}</strong></div><div><span>UANG YANG DILAPORKAN HILANG</span><strong>{formatRupiah(Number(report.allegedLoss))}</strong></div><div><span>AKUN TERKAIT</span><Link className="inline-profile-link" href={`/entity/${report.slug}`}>{String(report.entityName)} <span aria-hidden="true">↗</span></Link></div></aside>
    </section>
    <section className="data-panel case-identifiers"><h2>IDENTITAS & AKUN TERKAIT</h2><p className="publication-note">Nama seller adalah nama profil utama. Alias dan data lengkap di bawah berasal dari scam report yang sudah diperiksa admin.</p>{report.aliases.map((identifier, index) => <div className="identifier-row" key={`alias-${index}`}><span>{labelIdentifierType(identifier.type)}</span><strong>{identifier.displayValue}</strong></div>)}{report.identifiers.map((identifier, index) => <div className="identifier-row" key={`account-${index}`}><span>{labelIdentifierType(identifier.type)}</span><strong>{identifier.displayValue}</strong></div>)}</section>
    <EvidenceGallery publicId={report.publicId} evidence={report.evidence} evidenceUrl={report.evidenceUrl}/>
    <Disclaimer/>
  </main><Footer/></>;
}
