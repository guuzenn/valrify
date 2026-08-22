"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatRupiah, labelIdentifierType } from "@valrify/domain";
import { browserApi } from "../../../lib/browser-api";
import { AdminEvidenceViewer } from "../../components/AdminEvidenceViewer";
import { ConfirmationReviewActions } from "../../components/ConfirmationReviewActions";
import { Footer, Header } from "../../components/SiteChrome";
import { ReviewActions } from "../../components/ReviewActions";

type Evidence = { id: number; fileName: string; mimeType: string; size: number; evidenceType?: string; caption?: string; isPublicApproved?: boolean };
type ReviewRow = { id: number; publicId: string; title: string; chronology: string; transactionDate: string | null; createdAt: string; status: string; allegedLoss: number; evidenceUrl: string | null; entityName: string | null; reporterName: string; identifiers: Array<{ type: string; displayValue: string }>; evidence: Evidence[] };
type ConfirmationRow = { id: number; transactionDate: string; createdAt: string; amount: number; note: string; status: string; entityName: string; entitySlug: string; submitterName: string; evidence: Evidence[] };
type Overview = { reports: { total: number; pending: number; published: number; rejected: number }; confirmations: { pending: number; approved: number }; community: { pendingPosts: number; pendingComments: number }; reviewedLast24Hours: number; recentActions: Array<{ id: number; action: string; rationale: string; createdAt: string; actorName: string; reportPublicId: string | null; reportTitle: string | null; confirmationId: number | null; communityPostId: number | null; communityCommentId: number | null }> };
type Tab = "reports" | "confirmations" | "activity";

const statusLabels: Record<string, string> = { SUBMITTED: "BARU MASUK", UNDER_REVIEW: "SEDANG DICEK", NEEDS_INFO: "BUTUH DATA", VERIFIED: "SIAP TERBIT" };
const actionLabels: Record<string, string> = { REPORT_PUBLISHED: "SCAM REPORT DITERBITKAN", REPORT_REJECTED: "SCAM REPORT DITOLAK", TRANSACTION_CONFIRMATION_APPROVED: "TESTI DITERBITKAN", TRANSACTION_CONFIRMATION_REJECTED: "TESTI DITOLAK", COMMUNITY_POST_REMOVED: "POST COMMUNITY DIHAPUS", COMMUNITY_REPORTS_DISMISSED: "REPORT POST DITUTUP", COMMUNITY_COMMENT_REMOVED: "KOMENTAR DIHAPUS", COMMUNITY_COMMENT_REPORTS_DISMISSED: "REPORT KOMENTAR DITUTUP" };

function formatDate(value: string | null, withTime = false) {
  if (!value) return "Tidak dicantumkan";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", ...(withTime ? { timeStyle: "short" as const } : {}), timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function normalize(value: string) { return value.toLocaleLowerCase("id-ID").trim(); }

export default function ReviewPage() {
  const [reports, setReports] = useState<ReviewRow[] | null>(null);
  const [confirmations, setConfirmations] = useState<ConfirmationRow[] | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tab, setTab] = useState<Tab>("reports");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setError(""); setRefreshing(true);
    try {
      const [reportRows, confirmationRows, overviewData] = await Promise.all([browserApi<ReviewRow[]>("/admin/reports"), browserApi<ConfirmationRow[]>("/admin/transaction-confirmations"), browserApi<Overview>("/admin/overview")]);
      setReports(reportRows); setConfirmations(confirmationRows); setOverview(overviewData); setLastUpdated(new Date());
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Gagal memuat panel admin."); }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filteredReports = useMemo(() => {
    const needle = normalize(query);
    return (reports ?? []).filter((report) => {
      if (status !== "ALL" && report.status !== status) return false;
      if (!needle) return true;
      return [report.publicId, report.title, report.entityName ?? "", report.reporterName, ...report.identifiers.map((item) => item.displayValue)].some((value) => normalize(value).includes(needle));
    });
  }, [query, reports, status]);
  const filteredConfirmations = useMemo(() => { const needle = normalize(query); return !needle ? confirmations ?? [] : (confirmations ?? []).filter((item) => [item.entityName, item.submitterName, String(item.id)].some((value) => normalize(value).includes(needle))); }, [confirmations, query]);
  const pendingTotal = (reports?.length ?? 0) + (confirmations?.length ?? 0) + (overview?.community.pendingPosts ?? 0) + (overview?.community.pendingComments ?? 0);
  const loading = reports === null || confirmations === null || overview === null;

  return <><Header compact backHref="/" backLabel="Kembali ke situs"/><main className="page shell admin-panel">
    <div className="admin-commandbar"><div><span className="admin-live-dot"/> VALRIFY MODERATION OPS</div><div><Link href="/admin/community">REPORT POST</Link><Link href="/" target="_blank">BUKA SITUS ↗</Link><button type="button" disabled={refreshing} onClick={() => void load()}>{refreshing ? "MEMUAT..." : "REFRESH DATA"}</button></div></div>
    <section className="admin-hero"><div><p className="eyebrow">// ADMIN PANEL V1</p><h1 className="page-title">CONTROL<br/>ROOM.</h1></div><div><strong>{pendingTotal}</strong><span>ITEM PERLU TINDAKAN</span><small>{lastUpdated ? `Terakhir diperbarui ${formatDate(lastUpdated.toISOString(), true)}` : "Menghubungkan ke server..."}</small></div></section>

    {error ? <div className="admin-access-error"><span>AKSES TERBATAS</span><h2>PANEL TIDAK DAPAT DIBUKA.</h2><p>{error}</p><Link href="/login" className="tactical-button">MASUK SEBAGAI ADMIN</Link></div> : loading ? <div className="admin-loading"><span/><p>MENYIAPKAN WORKSPACE ADMIN...</p></div> : <>
      <section className="admin-stat-grid" aria-label="Ringkasan moderasi">
        <article className="urgent"><span>PERLU TINDAKAN</span><strong>{pendingTotal}</strong><small>{overview.community.pendingPosts} post · {overview.community.pendingComments} komentar</small></article><article><span>SCAM REPORT</span><strong>{overview.reports.pending}</strong><small>{overview.reports.published} sudah diterbitkan</small></article><article className="positive"><span>TESTI TRANSAKSI</span><strong>{overview.confirmations.pending}</strong><small>{overview.confirmations.approved} sudah diterbitkan</small></article><article><span>SELESAI 24 JAM</span><strong>{overview.reviewedLast24Hours}</strong><small>{overview.reports.rejected} laporan ditolak total</small></article>
      </section>
      <section className="admin-workspace">
        <div className="admin-tabs" role="tablist" aria-label="Jenis antrean"><button type="button" role="tab" aria-selected={tab === "reports"} onClick={() => setTab("reports")}><span>SCAM REPORT</span><strong>{reports.length}</strong></button><button type="button" role="tab" aria-selected={tab === "confirmations"} onClick={() => setTab("confirmations")}><span>TESTI TRANSAKSI</span><strong>{confirmations.length}</strong></button><button type="button" role="tab" aria-selected={tab === "activity"} onClick={() => setTab("activity")}><span>AKTIVITAS TERBARU</span><strong>{overview.recentActions.length}</strong></button></div>
        {tab !== "activity" && <div className="admin-toolbar"><label><span>CARI DI ANTREAN</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "reports" ? "ID laporan, seller, rekening, atau pengirim..." : "Nama profil, ID, atau pengirim..."}/></label>{tab === "reports" && <label><span>STATUS</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">SEMUA STATUS</option><option value="SUBMITTED">BARU MASUK</option><option value="UNDER_REVIEW">SEDANG DICEK</option><option value="NEEDS_INFO">BUTUH DATA</option><option value="VERIFIED">SIAP TERBIT</option></select></label>}</div>}

        {tab === "reports" && <section className="admin-queue" aria-label="Antrean scam report"><div className="admin-queue-heading"><div><span>// ANTREAN SCAM REPORT</span><h2>{filteredReports.length} ITEM DITEMUKAN</h2></div><p>Buka laporan, cocokkan cerita dengan bukti, lalu tulis ringkasan publik yang netral.</p></div>{filteredReports.length === 0 ? <div className="admin-zero"><strong>ANTREAN INI KOSONG.</strong><p>Coba ubah kata pencarian atau filter status.</p></div> : <div className="admin-review-list">{filteredReports.map((report) => <details className="admin-review-item" key={report.id}>
          <summary><div className="admin-review-index"><span>{report.publicId}</span><small>{statusLabels[report.status] ?? report.status}</small></div><div className="admin-review-subject"><strong>{report.title}</strong><span>{report.entityName ?? "Profil belum tersedia"} · oleh {report.reporterName}</span></div><div className="admin-review-value"><strong>{formatRupiah(report.allegedLoss)}</strong><span>{formatDate(report.createdAt)}</span></div><span className="admin-expand" aria-hidden="true">+</span></summary>
          <div className="admin-review-body"><div className="admin-fact-grid"><article><span>SELLER / PROFIL</span><strong>{report.entityName ?? "Belum tersedia"}</strong></article><article><span>TANGGAL KEJADIAN</span><strong>{formatDate(report.transactionDate)}</strong></article><article><span>BUKTI</span><strong>{report.evidence.length} FILE{report.evidenceUrl ? " + LINK" : ""}</strong></article><article><span>MASUK ANTREAN</span><strong>{formatDate(report.createdAt, true)}</strong></article></div><div className="admin-review-columns"><div><section className="admin-private-copy"><span>CERITA LENGKAP · PRIVAT</span><p>{report.chronology}</p></section><section className="admin-identifier-block"><span>DATA YANG PERLU DICOCOKKAN</span>{report.identifiers.map((identifier, index) => <div key={`${identifier.type}-${index}`}><small>{labelIdentifierType(identifier.type)}</small><strong>{identifier.displayValue}</strong></div>)}</section></div><div><section className="admin-evidence-block"><div><span>BUKTI UNTUK REVIEW</span>{report.evidenceUrl && <a href={report.evidenceUrl} target="_blank" rel="noreferrer">BUKA POSTING BUKTI ↗</a>}</div><AdminEvidenceViewer evidence={report.evidence}/></section></div></div><ReviewActions reportId={report.id} evidence={report.evidence.map((item) => ({ ...item, isPublicApproved: Boolean(item.isPublicApproved) }))} evidenceUrl={report.evidenceUrl} onDone={() => void load()}/></div>
        </details>)}</div>}</section>}

        {tab === "confirmations" && <section className="admin-queue" aria-label="Antrean testi transaksi"><div className="admin-queue-heading"><div><span>// ANTREAN TESTI</span><h2>{filteredConfirmations.length} ITEM DITEMUKAN</h2></div><p>Testi tidak memengaruhi risk label dan tetap harus diperiksa sebelum terbit.</p></div>{filteredConfirmations.length === 0 ? <div className="admin-zero"><strong>TIDAK ADA TESTI MENUNGGU.</strong><p>Coba ubah kata pencarian.</p></div> : <div className="admin-review-list">{filteredConfirmations.map((item) => <details className="admin-review-item confirmation" key={item.id}>
          <summary><div className="admin-review-index"><span>TESTI #{item.id}</span><small>MENUNGGU</small></div><div className="admin-review-subject"><strong>{item.entityName}</strong><span>Dikirim oleh {item.submitterName}</span></div><div className="admin-review-value"><strong>{formatRupiah(item.amount)}</strong><span>{formatDate(item.createdAt)}</span></div><span className="admin-expand" aria-hidden="true">+</span></summary><div className="admin-review-body"><div className="admin-fact-grid"><article><span>TANGGAL TRANSAKSI</span><strong>{formatDate(item.transactionDate)}</strong></article><article><span>BUKTI PRIVAT</span><strong>{item.evidence.length} FILE</strong></article><article><span>PROFIL PUBLIK</span><Link href={`/entity/${item.entitySlug}`} target="_blank">BUKA PROFIL ↗</Link></article></div><div className="admin-review-columns"><section className="admin-private-copy"><span>CERITA PENGGUNA</span><p>{item.note}</p></section><section className="admin-evidence-block"><div><span>BUKTI UNTUK REVIEW</span></div><AdminEvidenceViewer evidence={item.evidence} kind="confirmation"/></section></div><ConfirmationReviewActions confirmationId={item.id} onDone={() => void load()}/></div>
        </details>)}</div>}</section>}

        {tab === "activity" && <section className="admin-queue" aria-label="Aktivitas moderasi terbaru"><div className="admin-queue-heading"><div><span>// AUDIT RINGKAS</span><h2>AKTIVITAS TERBARU</h2></div><p>Catatan lengkap tetap tersimpan di database. Bagian ini menampilkan delapan keputusan terakhir.</p></div>{overview.recentActions.length === 0 ? <div className="admin-zero"><strong>BELUM ADA AKTIVITAS.</strong></div> : <ol className="admin-activity-list">{overview.recentActions.map((action) => <li key={action.id}><span className={action.action.includes("REJECTED") || action.action.includes("REMOVED") ? "rejected" : "published"}>{actionLabels[action.action] ?? action.action}</span><div><strong>{action.reportPublicId ? `${action.reportPublicId} · ${action.reportTitle}` : action.communityPostId ? `COMMUNITY POST #${action.communityPostId}` : action.communityCommentId ? `KOMENTAR #${action.communityCommentId}` : `TESTI #${action.confirmationId}`}</strong><p>{action.rationale}</p></div><div><strong>{action.actorName}</strong><time dateTime={action.createdAt}>{formatDate(action.createdAt, true)}</time></div></li>)}</ol>}</section>}
      </section>
    </>}
  </main><Footer/></>;
}
