"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatRupiah } from "@valrify/domain";
import { browserApi, notifyAuthSessionChanged } from "../../lib/browser-api";
import { PublicProfileSettings } from "../components/PublicProfileSettings";
import { Footer, Header } from "../components/SiteChrome";

type AccountOverview = {
  user: { displayName: string; email: string; username: string | null; bio: string; usernameCanChangeAt: string | null; role: string; emailVerified: boolean; joinedAt: string };
  stats: { reports: number; reportsPending: number; reportsPublished: number; confirmations: number; confirmationsApproved: number; posts: number; comments: number };
  reports: Array<{ id: number; publicId: string; title: string; status: string; publicSummary: string; allegedLoss: number; transactionDate: string | null; createdAt: string; updatedAt: string; publishedAt: string | null; entityName: string | null; entitySlug: string | null; evidenceCount: number; moderatorNote: string | null }>;
  confirmations: Array<{ id: number; status: string; transactionDate: string; amount: number; note: string; moderationNote: string; createdAt: string; reviewedAt: string | null; entityName: string; entitySlug: string; evidenceCount: number }>;
};
type AccountTab = "reports" | "confirmations";
type StatusInfo = { label: string; description: string; tone: string };

const reportStatus: Record<string, StatusInfo> = {
  SUBMITTED: { label: "MENUNGGU DICEK", description: "Laporan sudah masuk dan menunggu giliran admin.", tone: "pending" },
  UNDER_REVIEW: { label: "SEDANG DICEK", description: "Admin sedang mencocokkan cerita, data, dan bukti.", tone: "review" },
  NEEDS_INFO: { label: "BUTUH DATA", description: "Ada informasi yang perlu dilengkapi sebelum review dilanjutkan.", tone: "attention" },
  VERIFIED: { label: "SIAP DITERBITKAN", description: "Pemeriksaan selesai dan laporan menunggu publikasi.", tone: "review" },
  PUBLISHED: { label: "SUDAH TERBIT", description: "Laporan sudah dapat dilihat dan ditemukan lewat pencarian.", tone: "published" },
  REJECTED: { label: "TIDAK DITERBITKAN", description: "Laporan selesai diperiksa tetapi tidak diterbitkan.", tone: "rejected" },
  WITHDRAWN: { label: "DIBATALKAN", description: "Laporan telah dibatalkan.", tone: "muted" },
};
const confirmationStatus: Record<string, StatusInfo> = {
  PENDING: { label: "MENUNGGU DICEK", description: "Testi sudah masuk ke antrean admin.", tone: "pending" },
  APPROVED: { label: "SUDAH TERBIT", description: "Testi sudah tampil pada profil terkait.", tone: "published" },
  REJECTED: { label: "TIDAK DITERBITKAN", description: "Testi selesai diperiksa tetapi tidak diterbitkan.", tone: "rejected" },
};

function formatDate(value: string | null) {
  if (!value) return "Tidak dicantumkan";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function roleLabel(role: string) {
  return ({ USER: "ANGGOTA KOMUNITAS", VERIFIED_MIDDLEMAN: "VERIFIED MIDDLEMAN", MODERATOR: "MODERATOR", ADMIN: "ADMIN" } as Record<string, string>)[role] ?? role;
}

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState<AccountOverview | null>(null);
  const [tab, setTab] = useState<AccountTab>("reports");
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    browserApi<AccountOverview>("/account/overview").then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : "Gagal memuat akun."));
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      await browserApi("/auth/logout", { method: "POST" });
      notifyAuthSessionChanged();
      router.push("/login");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal keluar dari akun.");
      setLoggingOut(false);
    }
  }

  return <><Header compact backHref="/" backLabel="Kembali ke beranda"/><main className="page shell account-page">
    {error ? <section className="account-error"><span>// AKUN SAYA</span><h1>BELUM BISA DIBUKA.</h1><p>{error}</p><Link href="/login" className="tactical-button">MASUK KE AKUN</Link></section> : !data ? <div className="account-loading"><span/><p>MEMUAT AKUN SAYA...</p></div> : <>
      <section className="account-hero"><div className="account-avatar" aria-hidden="true">{data.user.displayName.slice(0, 1).toUpperCase()}</div><div className="account-identity"><p className="eyebrow">// AKUN SAYA V1</p><h1>{data.user.displayName}</h1><p>{data.user.email}</p><div><span data-role={data.user.role}>{roleLabel(data.user.role)}</span><span className={data.user.emailVerified ? "verified" : "unverified"}>{data.user.emailVerified ? "EMAIL TERVERIFIKASI" : "EMAIL BELUM TERVERIFIKASI"}</span></div></div><div className="account-actions"><small>Bergabung {formatDate(data.user.joinedAt)}</small>{(data.user.role === "ADMIN" || data.user.role === "MODERATOR") && <Link href="/admin/reports">BUKA ADMIN PANEL ↗</Link>}<button type="button" disabled={loggingOut} onClick={() => void logout()}>{loggingOut ? "MEMPROSES..." : "KELUAR"}</button></div></section>
      <PublicProfileSettings initialUsername={data.user.username} initialBio={data.user.bio} initialUsernameCanChangeAt={data.user.usernameCanChangeAt} onSaved={(profile) => setData((current) => current ? { ...current, user: { ...current.user, ...profile } } : current)}/>
      <section className="account-stat-grid" aria-label="Ringkasan akun"><article><span>SCAM REPORT</span><strong>{data.stats.reports}</strong><small>{data.stats.reportsPending} masih diproses</small></article><article className="published"><span>SUDAH TERBIT</span><strong>{data.stats.reportsPublished}</strong><small>Scam report publik</small></article><article className="positive"><span>TESTI DIKIRIM</span><strong>{data.stats.confirmations}</strong><small>{data.stats.confirmationsApproved} sudah terbit</small></article><article><span>AKTIVITAS COMMUNITY</span><strong>{data.stats.posts}</strong><small>{data.stats.comments} komentar · <Link href="/community">Buka community →</Link></small></article></section>
      <section className="account-workspace"><div className="account-tabs" role="tablist" aria-label="Riwayat kontribusi"><button type="button" role="tab" aria-selected={tab === "reports"} onClick={() => setTab("reports")}><span>SCAM REPORT SAYA</span><strong>{data.reports.length}</strong></button><button type="button" role="tab" aria-selected={tab === "confirmations"} onClick={() => setTab("confirmations")}><span>TESTI TRANSAKSI</span><strong>{data.confirmations.length}</strong></button></div>
        {tab === "reports" && <div className="account-history"><div className="account-section-heading"><div><span>// RIWAYAT LAPORAN</span><h2>SCAM REPORT SAYA.</h2></div><Link href="/submit">BUAT SCAM REPORT ↗</Link></div>{data.reports.length === 0 ? <div className="account-empty"><strong>BELUM ADA SCAM REPORT.</strong><p>Laporan yang kamu kirim akan muncul di sini beserta status pemeriksaannya.</p><Link href="/submit" className="tactical-button">BUAT LAPORAN</Link></div> : <div className="account-report-list">{data.reports.map((report) => { const status = reportStatus[report.status] ?? { label: report.status, description: "Status laporan diperbarui oleh admin.", tone: "muted" }; return <article key={report.id} className="account-history-card"><div className="account-history-top"><div><span>{report.publicId}</span><h3>{report.title}</h3><p>{report.entityName ?? "Profil belum tersedia"}</p></div><span className={`account-status ${status.tone}`}>{status.label}</span></div><div className="account-status-explain"><strong>STATUS SEKARANG</strong><p>{status.description}</p></div>{report.moderatorNote && <div className="account-moderator-note"><strong>CATATAN ADMIN</strong><p>{report.moderatorNote}</p></div>}<div className="account-history-facts"><span><small>TANGGAL KEJADIAN</small><strong>{formatDate(report.transactionDate)}</strong></span><span><small>DILAPORKAN HILANG</small><strong>{formatRupiah(report.allegedLoss)}</strong></span><span><small>BUKTI DIKIRIM</small><strong>{report.evidenceCount} FILE</strong></span><span><small>DIKIRIM</small><strong>{formatDate(report.createdAt)}</strong></span></div>{report.status === "PUBLISHED" && <div className="account-history-links"><Link href={`/case/${report.publicId}`}>BACA LAPORAN PUBLIK ↗</Link>{report.entitySlug && <Link href={`/entity/${report.entitySlug}`}>BUKA PROFIL ↗</Link>}</div>}</article>; })}</div>}</div>}
        {tab === "confirmations" && <div className="account-history"><div className="account-section-heading"><div><span>// RIWAYAT TESTI</span><h2>TESTI TRANSAKSI.</h2></div></div>{data.confirmations.length === 0 ? <div className="account-empty"><strong>BELUM ADA TESTI.</strong><p>Testi transaksi dikirim dari profil seller atau pembeli yang pernah kamu transaksikan.</p><Link href="/search" className="tactical-button">CARI PROFIL</Link></div> : <div className="account-report-list">{data.confirmations.map((item) => { const status = confirmationStatus[item.status] ?? { label: item.status, description: "Status testi diperbarui oleh admin.", tone: "muted" }; return <article key={item.id} className="account-history-card confirmation"><div className="account-history-top"><div><span>TESTI #{item.id}</span><h3>{item.entityName}</h3><p>Transaksi {formatDate(item.transactionDate)}</p></div><span className={`account-status ${status.tone}`}>{status.label}</span></div><div className="account-status-explain"><strong>STATUS SEKARANG</strong><p>{status.description}</p></div>{item.moderationNote && <div className="account-moderator-note"><strong>CATATAN ADMIN</strong><p>{item.moderationNote}</p></div>}<p className="account-confirmation-note">{item.note}</p><div className="account-history-facts"><span><small>NOMINAL</small><strong>{formatRupiah(item.amount)}</strong></span><span><small>BUKTI DIKIRIM</small><strong>{item.evidenceCount} FILE</strong></span><span><small>DIKIRIM</small><strong>{formatDate(item.createdAt)}</strong></span></div><div className="account-history-links"><Link href={`/entity/${item.entitySlug}`}>BUKA PROFIL ↗</Link></div></article>; })}</div>}</div>}
      </section>
      <aside className="account-privacy-note"><strong>DATA AKUN TETAP PRIVAT.</strong><p>Email, laporan yang belum terbit, bukti, dan catatan moderasi di halaman ini hanya tersedia untuk akunmu. Nama user biasa tetap tidak ditampilkan pada scam report publik.</p></aside>
    </>}
  </main><Footer/></>;
}
