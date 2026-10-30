"use client";

import { labelIdentifierType, labelReportCategory, labelReportPartyRole } from "@valrify/domain";
import { ArrowIcon } from "./ArrowIcon";
import { AdminEvidenceViewer } from "./AdminEvidenceViewer";
import { ReviewActions } from "./ReviewActions";
import { ReportEditor, type EditableReport } from "./ReportEditor";

type Evidence = { id: number; fileName: string; mimeType: string; size: number; evidenceType?: string; caption?: string; isPublicApproved?: boolean };
export type ReviewRow = EditableReport & { id: number; publicId: string; title: string; chronology: string; transactionType: string; transactionDate: string | null; createdAt: string; status: string; evidenceUrl: string | null; entityName: string | null; reporterName: string; guestContactEmail?: string | null; identifiers: Array<{ type: string; displayValue: string }>; evidence: Evidence[] };

const statusLabels: Record<string, string> = { SUBMITTED: "BARU MASUK", UNDER_REVIEW: "SEDANG DICEK", NEEDS_INFO: "BUTUH DATA", VERIFIED: "SIAP DITAMPILKAN", PUBLISHED: "SUDAH DITAMPILKAN" };

function formatDate(value: string | null, withTime = false) {
  if (!value) return "Tidak dicantumkan";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", ...(withTime ? { timeStyle: "short" as const } : {}), timeZone: "Asia/Jakarta" }).format(new Date(value));
}


export function ReportReview({ report, onSaved, endpointBase = "/admin", ownerMode = false }: { report: ReviewRow; onSaved: () => Promise<void>; endpointBase?: string; ownerMode?: boolean }) {
  return <details className="admin-review-item" key={report.id}>
          <summary><div className="admin-review-index"><span>{report.publicId}</span><small>{statusLabels[report.status] ?? report.status}</small></div><div className="admin-review-subject"><small>{labelReportCategory(report.transactionType)}</small><strong>{report.title}</strong><span>{report.entityName ?? "Profil belum tersedia"} · oleh {report.reporterName}</span></div><div className="admin-review-value"><span>{formatDate(report.createdAt)}</span></div><span className="admin-expand" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg></span></summary>
          <div className="admin-review-body">{report.guestContactEmail && <p>Email kontak pengirim (belum diverifikasi, hanya untuk admin): <a href={`mailto:${report.guestContactEmail}`}>{report.guestContactEmail}</a></p>}<div className="admin-fact-grid"><article><span>SELLER / PROFIL</span><strong>{report.entityName ?? "Belum tersedia"}</strong></article><article><span>TANGGAL KEJADIAN</span><strong>{formatDate(report.transactionDate)}</strong></article><article><span>BUKTI</span><strong>{report.evidence.length} FILE{report.evidenceUrl ? " + LINK" : ""}</strong></article><article><span>MASUK ANTREAN</span><strong>{formatDate(report.createdAt, true)}</strong></article></div><div className="admin-review-columns"><div><section className="admin-private-copy"><span>CERITA LENGKAP · PRIVAT</span><p>{report.chronology}</p></section><section className="admin-identifier-block"><span>DATA YANG PERLU DICOCOKKAN</span>{report.parties.map((party, partyIndex) => <section className="admin-party-identifiers" key={party.entityId ?? partyIndex}><h3>{party.entityName}</h3><p>{labelReportPartyRole(party.role)}{partyIndex === 0 ? " / PROFIL UTAMA" : ""}</p>{party.identifiers.map((identifier, index) => <div key={index}><small>{labelIdentifierType(identifier.type)}{identifier.provider ? ` / ${identifier.provider}` : ""}</small><strong>{identifier.value}</strong></div>)}</section>)}</section></div><div><section className="admin-evidence-block"><div><span>BUKTI UNTUK DIPERIKSA</span>{report.evidenceUrl && <a href={report.evidenceUrl} target="_blank" rel="noreferrer">BUKA POSTING BUKTI <ArrowIcon/></a>}</div><AdminEvidenceViewer evidence={report.evidence} basePath={`${endpointBase}/evidence`}/></section></div></div>{report.status === "PUBLISHED" && ownerMode ? <ReviewActions endpointBase={endpointBase} ownerMode={ownerMode} key={report.updatedAt} reportId={report.id} updatedAt={report.updatedAt} published={report.status === "PUBLISHED"} evidence={report.evidence.map((item) => ({ ...item, isPublicApproved: Boolean(item.isPublicApproved) }))} evidenceUrl={report.evidenceUrl} onDone={() => void onSaved()}/> : <ReportEditor endpointBase={endpointBase} key={report.updatedAt} report={report} onSaved={onSaved}><ReviewActions endpointBase={endpointBase} ownerMode={ownerMode} key={report.updatedAt} reportId={report.id} updatedAt={report.updatedAt} published={report.status === "PUBLISHED"} evidence={report.evidence.map((item) => ({ ...item, isPublicApproved: Boolean(item.isPublicApproved) }))} evidenceUrl={report.evidenceUrl} onDone={() => void onSaved()}/></ReportEditor>}</div>
        </details>;
}
