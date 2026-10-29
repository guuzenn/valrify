"use client";

import { ArrowIcon } from "../components/ArrowIcon";


import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { browserApi, notifyAuthSessionChanged } from "../../lib/browser-api";
import { PublicProfileSettings } from "../components/PublicProfileSettings";
import { SessionSettings } from "../components/SessionSettings";
import { Footer, Header } from "../components/SiteChrome";

type AccountOverview = {
  user: { displayName: string; email: string; username: string | null; bio: string; usernameCanChangeAt: string | null; role: string; emailVerified: boolean; joinedAt: string };
  stats: { reports: number; reportsPending: number; reportsPublished: number; posts: number; comments: number };
  reports: Array<{ id: number; publicId: string; title: string; status: string; publicSummary: string; transactionDate: string | null; createdAt: string; updatedAt: string; publishedAt: string | null; entityName: string | null; entitySlug: string | null; evidenceCount: number; moderatorNote: string | null }>;
};
type StatusInfo = { label: string; description: string; tone: string };

const reportStatus: Record<string, StatusInfo> = {
  SUBMITTED: { label: "MENUNGGU DICEK", description: "Laporan sudah masuk dan menunggu giliran admin.", tone: "pending" },
  UNDER_REVIEW: { label: "SEDANG DICEK", description: "Admin sedang mencocokkan cerita, data, dan bukti.", tone: "review" },
  NEEDS_INFO: { label: "BUTUH DATA", description: "Ada informasi yang perlu dilengkapi sebelum admin melanjutkan pemeriksaan.", tone: "attention" },
  VERIFIED: { label: "SIAP DITAMPILKAN", description: "Pemeriksaan selesai. Laporan akan segera muncul di Valrify.", tone: "review" },
  PUBLISHED: { label: "SUDAH DITAMPILKAN", description: "Laporan sudah dapat dilihat dan ditemukan lewat pencarian.", tone: "published" },
  REJECTED: { label: "TIDAK DITAMPILKAN", description: "Pemeriksaan selesai, tetapi laporan tidak ditampilkan.", tone: "rejected" },
  WITHDRAWN: { label: "DITARIK", description: "Laporan ditarik dan tidak dapat dilihat publik. Data tetap tersimpan dalam riwayat.", tone: "muted" },
};

function formatDate(value: string | null) {
  if (!value) return "Tidak dicantumkan";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function roleLabel(role: string) {
  return ({ USER: "PENGGUNA", VERIFIED_MIDDLEMAN: "REKBER TERVERIFIKASI", MODERATOR: "MODERATOR", ADMIN: "ADMIN" } as Record<string, string>)[role] ?? role;
}

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState<AccountOverview | null>(null);
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
    {error ? <section className="account-error"><span className="section-label">// AKUN SAYA</span><h1>BELUM BISA DIBUKA.</h1><p>{error}</p><Link href="/login" className="tactical-button">MASUK KE AKUN</Link></section> : !data ? <div className="account-loading"><span/><p>MEMUAT AKUN SAYA...</p></div> : <>
      <section className="account-hero"><div className="account-avatar" aria-hidden="true">{data.user.displayName.slice(0, 1).toUpperCase()}</div><div className="account-identity"><p className="section-label eyebrow">// AKUN SAYA</p><h1>{data.user.displayName}</h1><p>{data.user.email}</p><div><span data-role={data.user.role}>{roleLabel(data.user.role)}</span><span className={data.user.emailVerified ? "verified" : "unverified"}>{data.user.emailVerified ? "EMAIL SUDAH DIVERIFIKASI" : "EMAIL BELUM DIVERIFIKASI"}</span></div></div><div className="account-actions"><small>Bergabung {formatDate(data.user.joinedAt)}</small>{(data.user.role === "ADMIN" || data.user.role === "MODERATOR") && <Link href="/admin">BUKA PANEL ADMIN <ArrowIcon/></Link>}{(data.user.role === "ADMIN" || data.user.role === "VERIFIED_MIDDLEMAN") && <Link href="/account/reports">KELOLA LAPORAN SAYA <ArrowIcon/></Link>}<button className="account-logout" type="button" disabled={loggingOut} onClick={() => void logout()}>{loggingOut ? "MEMPROSES..." : "KELUAR"}</button></div></section>

      <section className="account-stat-grid" aria-label="Ringkasan akun"><article><span>LAPORAN DIKIRIM</span><strong>{data.stats.reports}</strong><small>{data.stats.reportsPending} masih diperiksa</small></article><article className="published"><span>LAPORAN DITAMPILKAN</span><strong>{data.stats.reportsPublished}</strong><small>Bisa ditemukan lewat pencarian</small></article><article><span>PROFIL PUBLIK</span><strong>{data.user.username ? "AKTIF" : "BELUM"}</strong><small>{data.user.username ? <Link href={`/u/${data.user.username}`}>Buka @{data.user.username} <ArrowIcon direction="right"/></Link> : "Buat username di pengaturan profil"}</small></article></section>
      <section className="account-workspace">
        <div className="account-history"><div className="account-section-heading"><div><span className="section-label">// RIWAYAT LAPORAN</span><h2>SCAM REPORT SAYA.</h2></div><Link href="/submit">Buat laporan <ArrowIcon/></Link></div>{data.reports.length === 0 ? <div className="account-empty"><strong>BELUM ADA SCAM REPORT.</strong><p>Laporan yang kamu kirim akan muncul di sini beserta status pemeriksaannya.</p><Link href="/submit" className="tactical-button">Buat laporan</Link></div> : <div className="account-report-list">{data.reports.map((report) => { const status = reportStatus[report.status] ?? { label: report.status, description: "Status laporan diperbarui oleh admin.", tone: "muted" }; return <article key={report.id} className="account-history-card"><div className="account-history-top"><div><span>{report.publicId}</span><h3>{report.title}</h3><p>{report.entityName ?? "Profil belum tersedia"}</p></div><span className={`account-status ${status.tone}`}>{status.label}</span></div><div className="account-status-explain"><strong>STATUS SEKARANG</strong><p>{status.description}</p></div>{report.moderatorNote && <div className="account-moderator-note"><strong>CATATAN ADMIN</strong><p>{report.moderatorNote}</p></div>}<div className="account-history-facts"><span><small>TANGGAL KEJADIAN</small><strong>{formatDate(report.transactionDate)}</strong></span><span><small>BUKTI DIKIRIM</small><strong>{report.evidenceCount} FILE</strong></span><span><small>DIKIRIM</small><strong>{formatDate(report.createdAt)}</strong></span></div>{report.status === "PUBLISHED" && <div className="account-history-links"><Link href={`/case/${report.publicId}`}>Baca laporan <ArrowIcon/></Link>{report.entitySlug && <Link href={`/entity/${report.entitySlug}`}>Buka profil <ArrowIcon/></Link>}</div>}</article>; })}</div>}</div>
      </section>
      <aside className="account-privacy-note"><strong>DATA INI HANYA BISA KAMU LIHAT.</strong><p>Email, laporan yang belum ditampilkan, bukti, dan catatan admin di halaman ini tidak dapat dilihat pengguna lain. Nama pengirim dari role publik tepercaya dapat ditampilkan pada laporan yang sudah terbit.</p></aside>
      <details className="reading-disclosure"><summary>Pengaturan profil</summary>      <PublicProfileSettings initialUsername={data.user.username} initialBio={data.user.bio} initialUsernameCanChangeAt={data.user.usernameCanChangeAt} onSaved={(profile) => setData((current) => current ? { ...current, user: { ...current.user, ...profile } } : current)}/></details>
      <details className="reading-disclosure"><summary>Keamanan dan sesi login</summary><SessionSettings/></details>
    </>}
  </main><Footer/></>;
}
