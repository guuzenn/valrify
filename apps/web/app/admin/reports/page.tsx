"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { browserApi } from "../../../lib/browser-api";
import { AdminFeedback, AdminPageHeader } from "../../components/AdminUi";
import { Select } from "../../components/Select";
import { ReportReview, type ReviewRow } from "../../components/ReportReview";

type Queue = "PENDING" | "PUBLISHED";
export default function ReviewPage() {
  return <Suspense fallback={<main className="operations-page"><p role="status">Memuat laporan...</p></main>}><ReportQueue/></Suspense>;
}

function ReportQueue() {
  const params = useSearchParams(), router = useRouter();
  const tab: Queue = params.get("status") === "PUBLISHED" ? "PUBLISHED" : "PENDING";
  const setTab = (value: Queue) => router.replace(`/admin/reports?status=${value}`, { scroll: false });
  const [data, setData] = useState<{ rows: ReviewRow[]; tab: Queue } | null>(null);
  const rows = data?.tab === tab ? data.rows : null;
  const [query, setQuery] = useState(""), [status, setStatus] = useState("ALL");
  const [error, setError] = useState(""), [refreshing, setRefreshing] = useState(false);
  const request = useRef(0);
  const load = useCallback(async () => {
    const current = ++request.current;
    setError(""); setRefreshing(true);
    try { const result = await browserApi<ReviewRow[]>("/admin/reports?status=" + tab); if (current === request.current) setData({ rows: result, tab }); }
    catch (reason) { if (current === request.current) setError(reason instanceof Error ? reason.message : "Laporan gagal dimuat."); }
    finally { if (current === request.current) setRefreshing(false); }
  }, [tab]);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => {
    const needle = query.toLocaleLowerCase("id-ID").trim();
    return (rows ?? []).filter(report => (tab !== "PENDING" || status === "ALL" || report.status === status) && (!needle || [report.publicId, report.title, report.entityName ?? "", report.reporterName, ...report.identifiers.map(item => item.displayValue)].some(value => value.toLocaleLowerCase("id-ID").includes(needle))));
  }, [rows, query, status, tab]);
  return <main className="operations-page admin-panel">
    <AdminPageHeader label="Moderasi laporan" title="LAPORAN." description="Cocokkan pihak terlapor dengan bukti, koreksi data, lalu tentukan publikasinya."><button type="button" disabled={refreshing} onClick={() => void load()}>{refreshing ? "MEMUAT..." : "MUAT ULANG"}</button></AdminPageHeader>
    <AdminFeedback message={error}/>
    <section className="admin-workspace"><div className="admin-tabs admin-report-tabs" role="tablist" aria-label="Status laporan"><button type="button" role="tab" aria-selected={tab === "PENDING"} onClick={() => setTab("PENDING")}>PERLU TINDAKAN</button><button type="button" role="tab" aria-selected={tab === "PUBLISHED"} onClick={() => setTab("PUBLISHED")}>SUDAH TAMPIL</button></div>
      <div className="operations-filters"><label>Cari laporan<input value={query} onChange={event => setQuery(event.target.value)} placeholder="ID laporan, nama, nomor, atau pengirim"/></label>{tab === "PENDING" && <label>Status<Select label="Status laporan" value={status} onValueChange={setStatus}><option value="ALL">Semua status</option><option value="SUBMITTED">Baru masuk</option><option value="UNDER_REVIEW">Sedang dicek</option><option value="NEEDS_INFO">Butuh data</option><option value="VERIFIED">Siap ditampilkan</option></Select></label>}</div>
      {refreshing && <p className="operations-empty" role="status">Memuat laporan...</p>}
      {rows && <section className="admin-queue" aria-label="Daftar scam report"><div className="admin-queue-heading"><div><span>// {tab === "PUBLISHED" ? "LAPORAN PUBLIK" : "ANTREAN PEMERIKSAAN"}</span><h2>{filtered.length} LAPORAN</h2></div><p>{tab === "PUBLISHED" ? "Tarik laporan yang keliru dengan alasan. Data sumber dan audit tetap tersimpan." : "Ringkasan netral, catatan keputusan, serta bukti publik wajib diperiksa sebelum diterbitkan."}</p></div>{!filtered.length ? <div className="admin-zero"><strong>DAFTAR INI KOSONG.</strong><p>Coba ubah pencarian atau filter.</p></div> : <div className="admin-review-list">{filtered.map(report => <ReportReview key={report.id} report={report} onSaved={load}/>)}</div>}</section>}
    </section>
  </main>;
}
