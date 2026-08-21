import { redirect } from "next/navigation";
import { chatGPTSignInPath } from "../../chatgpt-auth";
import { getActor } from "../../../lib/auth";
import { canModerate, formatRupiah, labelIdentifierType } from "../../../lib/domain";
import { listReviewQueue } from "../../../lib/data";
import { Header, Footer } from "../../components/SiteChrome";
import { ReviewActions } from "../../components/ReviewActions";

type ReviewIdentifier = { type: string; maskedValue: string };
type ReviewEvidence = { id: number; fileName: string; size: number };
type ReviewRow = {
  id: number; publicId: string; title: string; chronology: string; status: string;
  allegedLoss: number; entityName: string; reporterName: string;
  identifiers: ReviewIdentifier[]; evidence: ReviewEvidence[];
};

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const actor = await getActor();
  if (!actor) redirect(chatGPTSignInPath("/admin/reports"));
  if (!canModerate(actor.role)) return <><Header compact /><main className="page shell"><div className="empty-state"><span>403</span><h1>AKSES DITOLAK.</h1><p>Akun ini tidak memiliki izin moderator. Tambahkan email creator ke konfigurasi VLRFY_ADMIN_EMAILS.</p></div></main></>;
  const rows = await listReviewQueue() as ReviewRow[];
  return <><Header compact /><main className="page shell"><p className="eyebrow">// MODERATION DESK</p><div className="admin-title"><h1 className="page-title">REVIEW QUEUE.</h1><span>{rows.length} MENUNGGU</span></div>
    {rows.length === 0 ? <div className="empty-state"><span>00</span><h2>ANTREAN BERSIH.</h2><p>Tidak ada laporan yang menunggu keputusan.</p></div> : <div className="review-list">{rows.map((report) => <article className="review-card" key={report.id}>
      <div className="review-top"><div><p className="panel-index">{report.publicId} · {report.status}</p><h2>{report.title}</h2><p>Subjek: <strong>{report.entityName}</strong> · pelapor internal: {report.reporterName}</p></div><strong>{formatRupiah(Number(report.allegedLoss))}</strong></div>
      <div className="private-box"><span>KRONOLOGI PRIVAT</span><p>{report.chronology}</p></div>
      <div className="review-columns"><div><h3>IDENTIFIER</h3>{report.identifiers.map((identifier, index) => <p key={index}>{labelIdentifierType(identifier.type)} · <strong>{identifier.maskedValue}</strong></p>)}</div><div><h3>EVIDENCE PRIVAT</h3>{report.evidence.map((evidence) => <a key={evidence.id} href={`/api/admin/evidence/${evidence.id}`} target="_blank" rel="noreferrer">{evidence.fileName} · {Math.ceil(evidence.size / 1024)} KB ↗</a>)}</div></div>
      <ReviewActions reportId={report.id} />
    </article>)}</div>}
  </main><Footer /></>;
}
