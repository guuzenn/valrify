import { ArrowIcon } from "../../components/ArrowIcon";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatIndonesianDate, labelIdentifierType, labelReportCategory, labelReportPartyRole } from "@valrify/domain";
import { Disclaimer, Footer, Header } from "../../components/SiteChrome";
import { readableParagraphs } from "../../../lib/readable-text";
import { EvidenceGallery } from "../../components/EvidenceGallery";
import { getPublicCase } from "../../../lib/api";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ publicId: string }> }): Promise<Metadata> {
  const { publicId } = await params;
  const report = await getPublicCase(publicId);
  if (!report) return { title: "Laporan tidak ditemukan" };
  const description = String(report.publicSummary);
  return {
    title: `Laporan ${report.publicId}`,
    description,
    openGraph: { title: `Laporan ${report.publicId} — Valrify`, description, images: [] },
    twitter: { card: "summary", title: `Laporan ${report.publicId} — Valrify`, description, images: [] },
  };
}

export default async function CasePage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const report = await getPublicCase(publicId);
  if (!report) notFound();

  return <><Header compact backHref={`/entity/${report.slug}`} backLabel="Kembali ke profil"/><main className="page shell case-page">
    <div className="case-heading"><div><p className="eyebrow">LAPORAN // {report.publicId}</p><h1 className="page-title">{report.title}</h1><div className="uploader-line" data-role={report.uploadedBy.role}><span className="uploader-copy"><span>DIKIRIM OLEH</span><strong>{report.uploadedBy.displayName}</strong></span><em title="Jenis akun pengirim. Role pengirim bukan jaminan kebenaran isi laporan.">{report.uploadedBy.roleLabel}</em></div></div></div>
    <section className="data-panel case-identifiers"><h2>PIHAK & AKUN YANG DILAPORKAN</h2><p className="publication-note">Setiap pihak memiliki profil dan data akun sendiri. Keterkaitan dalam kasus ini tidak berarti mereka orang yang sama.</p>{report.parties?.length ? report.parties.map(party => <article className="case-party" key={party.entityId}><div className="case-party-heading"><span>{labelReportPartyRole(party.role)}</span><Link href={`/entity/${party.slug}`}>{party.entityName} <ArrowIcon/></Link></div>{party.identifiers.filter(identifier => identifier.type !== "PERSON_NAME" || identifier.displayValue.toLocaleLowerCase("id-ID") !== party.entityName.toLocaleLowerCase("id-ID")).map((identifier, index) => <div className="identifier-row" key={index}><span>{labelIdentifierType(identifier.type)}</span><strong>{identifier.displayValue}</strong></div>)}</article>) : [...report.aliases, ...report.identifiers].map((identifier, index) => <div className="identifier-row" key={index}><span>{labelIdentifierType(identifier.type)}</span><strong>{identifier.displayValue}</strong></div>)}</section>
    <article className="case-body reading-body"><h2>Cerita kejadian</h2>{readableParagraphs(report.publicSummary).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</article>
    <EvidenceGallery publicId={report.publicId} evidence={report.evidence} evidenceUrl={report.evidenceUrl}/>
    <aside className="case-facts" aria-label="Detail laporan"><div><span>STATUS</span><strong>SUDAH DITAMPILKAN</strong></div><div><span>KATEGORI</span><strong>{labelReportCategory(report.transactionType)}</strong></div><div><span>TANGGAL KEJADIAN</span><strong>{formatIndonesianDate(report.transactionDate)}</strong></div><div><span>AKUN TERKAIT</span><Link className="inline-profile-link" href={`/entity/${report.slug}`}>{String(report.entityName)} <span aria-hidden="true"><ArrowIcon/></span></Link></div></aside>
    <Disclaimer/>
  </main><Footer/></>;
}
