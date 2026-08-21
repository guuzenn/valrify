"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatRupiah, labelIdentifierType } from "@vlrfy/domain";
import { browserApi, browserApiUrl } from "../../../lib/browser-api";
import { ConfirmationReviewActions } from "../../components/ConfirmationReviewActions";
import { Footer, Header } from "../../components/SiteChrome";
import { ReviewActions } from "../../components/ReviewActions";

type ReviewRow = { id:number;publicId:string;title:string;chronology:string;status:string;allegedLoss:number;entityName:string;reporterName:string;identifiers:Array<{type:string;maskedValue:string}>;evidence:Array<{id:number;fileName:string;size:number}> };
type ConfirmationRow = { id:number;transactionDate:string;amount:number;note:string;status:string;entityName:string;entitySlug:string;submitterName:string;evidence:Array<{id:number;fileName:string;size:number}> };

export default function ReviewPage() {
  const [reports, setReports] = useState<ReviewRow[] | null>(null);
  const [confirmations, setConfirmations] = useState<ConfirmationRow[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setError("");
    Promise.all([
      browserApi<ReviewRow[]>("/admin/reports"),
      browserApi<ConfirmationRow[]>("/admin/transaction-confirmations"),
    ]).then(([reportRows, confirmationRows]) => {
      setReports(reportRows);
      setConfirmations(confirmationRows);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Gagal memuat antrean."));
  }, []);
  useEffect(() => { load(); }, [load]);
  const total = (reports?.length ?? 0) + (confirmations?.length ?? 0);

  return <><Header compact/><main className="page shell">
    <p className="eyebrow">// MODERATION DESK</p>
    <div className="admin-title"><h1 className="page-title">REVIEW QUEUE.</h1><span>{total} MENUNGGU</span></div>
    {error?<div className="empty-state"><span>AUTH</span><h2>AKSES MODERATOR DIPERLUKAN.</h2><p>{error}</p><Link href="/login" className="tactical-button">MASUK</Link></div>:reports===null||confirmations===null?<div className="actor-bar">MEMUAT ANTREAN...</div>:<>
      <section className="queue-section"><div className="queue-heading"><h2>LAPORAN KASUS</h2><span>{reports.length}</span></div>{reports.length===0?<div className="queue-empty">TIDAK ADA LAPORAN MENUNGGU.</div>:<div className="review-list">{reports.map((report)=><article className="review-card" key={report.id}><div className="review-top"><div><p className="panel-index">{report.publicId} · {report.status}</p><h2>{report.title}</h2><p>Subjek: <strong>{report.entityName}</strong> · pelapor internal: {report.reporterName}</p></div><strong>{formatRupiah(report.allegedLoss)}</strong></div><div className="private-box"><span>KRONOLOGI PRIVAT</span><p>{report.chronology}</p></div><div className="review-columns"><div><h3>IDENTIFIER</h3>{report.identifiers.map((identifier,index)=><p key={index}>{labelIdentifierType(identifier.type)} · <strong>{identifier.maskedValue}</strong></p>)}</div><div><h3>EVIDENCE PRIVAT</h3>{report.evidence.map((evidence)=><a key={evidence.id} href={`${browserApiUrl}/admin/evidence/${evidence.id}`} target="_blank" rel="noreferrer">{evidence.fileName} · {Math.ceil(evidence.size/1024)} KB ↗</a>)}</div></div><ReviewActions reportId={report.id} onDone={load}/></article>)}</div>}</section>
      <section className="queue-section"><div className="queue-heading"><h2>KONFIRMASI TRANSAKSI</h2><span>{confirmations.length}</span></div>{confirmations.length===0?<div className="queue-empty">TIDAK ADA KONFIRMASI MENUNGGU.</div>:<div className="review-list">{confirmations.map((confirmation)=><article className="review-card confirmation-review" key={confirmation.id}><div className="review-top"><div><p className="panel-index">TRANSACTION // {confirmation.id} · {confirmation.status}</p><h2>{confirmation.entityName}</h2><p>Pengirim internal: {confirmation.submitterName} · tanggal transaksi: {new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(confirmation.transactionDate))}</p></div><strong>{formatRupiah(confirmation.amount)}</strong></div><div className="private-box"><span>CATATAN KONFIRMASI</span><p>{confirmation.note}</p></div><div className="review-columns"><div><h3>PROFIL</h3><Link href={`/entity/${confirmation.entitySlug}`} target="_blank">Buka profil publik ↗</Link></div><div><h3>BUKTI PRIVAT</h3>{confirmation.evidence.length===0?<p>Tidak ada bukti diunggah.</p>:confirmation.evidence.map((evidence)=><a key={evidence.id} href={`${browserApiUrl}/admin/transaction-confirmation-evidence/${evidence.id}`} target="_blank" rel="noreferrer">{evidence.fileName} · {Math.ceil(evidence.size/1024)} KB ↗</a>)}</div></div><ConfirmationReviewActions confirmationId={confirmation.id} onDone={load}/></article>)}</div>}</section>
    </>}
  </main><Footer/></>;
}
