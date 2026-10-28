"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { browserApi } from "../../lib/browser-api";
import { ArrowIcon } from "../components/ArrowIcon";
import { AdminFeedback, AdminPageHeader } from "../components/AdminUi";

type Summary = { reports: { total: number; pending: number; published: number; rejected: number }; community: { pendingPosts: number; pendingComments: number }; reviewedLast24Hours: number };
type Counts = { users: { total: number; verified: number; middlemen: number }; directory: { total: number; published: number } };

export default function AdminDashboard() {
  const [data, setData] = useState<{ summary: Summary; counts: Counts; role: string; name: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [summary, counts, me] = await Promise.all([browserApi<Summary>("/admin/overview"), browserApi<Counts>("/admin/dashboard"), browserApi<{ user: { role: string; displayName: string } }>("/auth/me")]);
      setData({ summary, counts, role: me.user.role, name: me.user.displayName });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Dashboard belum dapat dimuat."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <main className="operations-page">
    <AdminPageHeader label="Pusat kendali" title="BERANDA ADMIN." description={data ? `Selamat datang, ${data.name}. Berikut kondisi Valrify dan pekerjaan yang perlu ditangani.` : "Ringkasan operasional Valrify."}><button type="button" disabled={loading} onClick={() => void load()}>{loading ? "MEMUAT..." : "MUAT ULANG"}</button></AdminPageHeader>
    <AdminFeedback message={error}/>
    {!data ? !error && <p role="status">Memuat ringkasan...</p> : <>
      <section className="operations-stats" aria-label="Ringkasan Valrify">
        <Link href="/admin/reports" className="urgent"><span>PERLU DIPERIKSA <ArrowIcon/></span><strong>{data.summary.reports.pending}</strong><small>Laporan penipuan menunggu tindakan</small></Link>
        <Link href="/admin/community"><span>COMMUNITY <ArrowIcon/></span><strong>{data.summary.community.pendingPosts + data.summary.community.pendingComments}</strong><small>{data.summary.community.pendingPosts} post · {data.summary.community.pendingComments} komentar dilaporkan</small></Link>
        <Link href="/admin/reports?status=PUBLISHED"><span>LAPORAN PUBLIK <ArrowIcon/></span><strong>{data.summary.reports.published}</strong><small>Dari {data.summary.reports.total} laporan yang masuk</small></Link>
        {data.role === "ADMIN" && <Link href="/admin/users"><span>PENGGUNA <ArrowIcon/></span><strong>{data.counts.users.total}</strong><small>{data.counts.users.verified} email terverifikasi</small></Link>}
      </section>
      <section className="operations-dashboard-grid">
        <div className="operations-card"><div className="operations-card-title"><p className="eyebrow">// MULAI DARI SINI</p><h2>PEKERJAAN HARI INI.</h2></div><div className="operations-task-list"><Link href="/admin/reports"><div><strong>Periksa laporan yang masuk</strong><p>Cocokkan data dan bukti, lalu tentukan publikasinya.</p></div><span>{data.summary.reports.pending}</span><ArrowIcon direction="right"/></Link><Link href="/admin/community"><div><strong>Jaga percakapan Community</strong><p>Tangani post atau komentar yang dilaporkan.</p></div><span>{data.summary.community.pendingPosts + data.summary.community.pendingComments}</span><ArrowIcon direction="right"/></Link>{data.role === "ADMIN" && <Link href="/admin/directory"><div><strong>Kelola direktori rekber</strong><p>{data.counts.directory.published} tampil · {data.counts.directory.total - data.counts.directory.published} belum tampil.</p></div><span>{data.counts.directory.total}</span><ArrowIcon direction="right"/></Link>}</div></div>
        <div className="operations-card operations-dark-card"><p className="eyebrow">// AKSES SESUAI PERAN</p><h2>KENDALI DI TANGANMU.</h2><p>Rekber terverifikasi mengelola kirimannya sendiri. Admin dan moderator menangani antrean pengguna.</p>{data.role === "ADMIN" && <Link className="tactical-button" href="/admin/users">KELOLA PENGGUNA <ArrowIcon/></Link>}<small>{data.summary.reviewedLast24Hours} tindakan tercatat dalam 24 jam terakhir.</small></div>
      </section>
      <section className="operations-quick-links"><Link href="/submit">Buat laporan baru <ArrowIcon/></Link><Link href="/rekber">Lihat halaman rekber <ArrowIcon/></Link>{data.role === "ADMIN" && <Link href="/admin/activity">Buka riwayat aktivitas <ArrowIcon/></Link>}<Link href="/admin/security">Periksa keamanan sesi <ArrowIcon/></Link></section>
    </>}
  </main>;
}
