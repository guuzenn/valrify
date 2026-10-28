"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { browserApi } from "../../../lib/browser-api";
import { ReportReview, type ReviewRow } from "../../components/ReportReview";
import { Footer, Header } from "../../components/SiteChrome";

export default function OwnReportsPage() {
  const [pending, setPending] = useState<ReviewRow[] | null>(null);
  const [published, setPublished] = useState<ReviewRow[]>([]);
  const [tab, setTab] = useState<"pending" | "published">("pending");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [drafts, live] = await Promise.all([browserApi<ReviewRow[]>("/account/reports"), browserApi<ReviewRow[]>("/account/reports?status=PUBLISHED")]);
      setPending(drafts); setPublished(live);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Laporan belum bisa dimuat."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const rows = tab === "pending" ? pending ?? [] : published;
  return <><Header compact backHref="/account" backLabel="Kembali ke akun"/><main className="page shell admin-panel">
    <section className="own-reports-hero"><p className="eyebrow">// LAPORAN SAYA</p><h1 className="page-title">KELOLA<br/>LAPORAN SAYA.</h1><p>Lengkapi kirimanmu, periksa bukti yang aman dibagikan, lalu tampilkan laporan. Halaman ini hanya memuat laporan dari akunmu sendiri.</p></section>
    <div className="admin-commandbar"><Link href="/submit" className="tactical-button">BUAT LAPORAN</Link><button type="button" disabled={loading} onClick={() => void load()}>{loading ? "MEMUAT..." : "MUAT ULANG"}</button></div>
    {error ? <div className="admin-access-error" role="alert"><h2>LAPORAN BELUM BISA DIBUKA.</h2><p>{error}</p><p>Halaman ini tersedia untuk admin dan rekber terverifikasi.</p><Link href="/account">KEMBALI KE AKUN</Link></div> : pending === null ? <p role="status">Memuat laporanmu...</p> : <section className="admin-workspace">
      <div className="admin-tabs admin-report-tabs" role="tablist" aria-label="Status laporan saya"><button type="button" role="tab" aria-selected={tab === "pending"} onClick={() => setTab("pending")}><span>BELUM TAMPIL</span><strong>{pending.length}</strong></button><button type="button" role="tab" aria-selected={tab === "published"} onClick={() => setTab("published")}><span>SUDAH TAMPIL</span><strong>{published.length}</strong></button></div>
      <section className="admin-queue"><div className="admin-queue-heading"><div><span>// KIRIMAN AKUNMU</span><h2>{rows.length} LAPORAN</h2></div><p>{tab === "pending" ? "Ringkasan minimal 30 karakter, catatan minimal 10 karakter, serta link bukti atau gambar publik wajib disertakan." : "Laporan ini sudah dapat dibaca publik. Tarik laporan bila ada kekeliruan."}</p></div>{rows.length ? <div className="admin-review-list">{rows.map(report => <ReportReview key={report.id} report={report} onSaved={load} endpointBase="/account" ownerMode/>)}</div> : <div className="admin-zero"><strong>BELUM ADA LAPORAN DI DAFTAR INI.</strong><p>Seluruh riwayat kiriman tetap tersedia di Akun Saya.</p></div>}</section>
    </section>}
  </main><Footer/></>;
}
