"use client";

import { ArrowIcon } from "../components/ArrowIcon";
import { TaskDialog } from "../components/TaskDialog";
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
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      <section className="account-profile-header" aria-label="Profil saya">
        <div className="account-profile-top"><div className="account-avatar" aria-hidden="true">{data.user.displayName.slice(0, 1).toUpperCase()}</div><button className="account-settings-button" type="button" aria-label="Pengaturan akun" aria-haspopup="dialog" onClick={() => setSettingsOpen(true)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9.5 3-.6 2.2-1.4.8-2.2-.6-2.5 4.3L4.4 11v2l-1.6 1.3 2.5 4.3 2.2-.6 1.4.8.6 2.2h5l.6-2.2 1.4-.8 2.2.6 2.5-4.3L19.6 13v-2l1.6-1.3-2.5-4.3-2.2.6-1.4-.8-.6-2.2z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
        <h1>{data.user.displayName}</h1>
        {data.user.username ? <Link className="account-profile-handle" href={`/u/${data.user.username}`}>@{data.user.username} <ArrowIcon direction="right"/></Link> : <button className="account-create-handle" type="button" onClick={() => setSettingsOpen(true)}>Buat username untuk profil publik <ArrowIcon direction="right"/></button>}
        {data.user.bio && <p className="account-profile-bio">{data.user.bio}</p>}
        <div className="account-profile-meta">{data.user.role !== "USER" && <span className="account-role-badge" data-role={data.user.role}>{roleLabel(data.user.role)}</span>}<span>Bergabung {formatDate(data.user.joinedAt)}</span></div>
        <div className="account-profile-links">{(data.user.role === "ADMIN" || data.user.role === "MODERATOR") && <Link href="/admin">Panel admin <ArrowIcon/></Link>}{(data.user.role === "ADMIN" || data.user.role === "VERIFIED_MIDDLEMAN") && <Link href="/account/reports">Kelola laporan <ArrowIcon/></Link>}</div>
        <dl className="account-profile-stats" aria-label="Ringkasan laporan"><div><dt>Laporan</dt><dd>{data.stats.reports}</dd></div><div><dt>Ditampilkan</dt><dd>{data.stats.reportsPublished}</dd></div><div><dt>Dalam proses</dt><dd>{data.stats.reportsPending}</dd></div></dl>
      </section>
      <section className="account-workspace">
        <div className="account-history"><div className="account-section-heading"><h2>Riwayat laporan</h2><Link href="/submit">Buat laporan <ArrowIcon/></Link></div>{data.reports.length === 0 ? <div className="account-empty"><span className="account-empty-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h5"/></svg></span><strong>Belum ada laporan.</strong><p>Status dan catatan admin akan muncul di sini setelah kamu mengirim laporan.</p></div> : <div className="account-report-list">{data.reports.map((report) => { const status = reportStatus[report.status] ?? { label: report.status, description: "Status laporan diperbarui oleh admin.", tone: "muted" }; return <article key={report.id} className="account-history-card"><div className="account-history-top"><div><span>{report.publicId}</span><h3>{report.title}</h3><p>Terlapor: {report.entityName ?? "Profil belum tersedia"}</p></div><span className={`account-status ${status.tone}`}>{status.label}</span></div><div className="account-status-explain"><p>{status.description}</p></div>{report.moderatorNote && <div className="account-moderator-note"><strong>CATATAN ADMIN</strong><p>{report.moderatorNote}</p></div>}<div className="account-history-facts"><span><small>TANGGAL KEJADIAN</small><strong>{formatDate(report.transactionDate)}</strong></span><span><small>BUKTI DIKIRIM</small><strong>{report.evidenceCount} FILE</strong></span><span><small>DIKIRIM</small><strong>{formatDate(report.createdAt)}</strong></span></div>{report.status === "PUBLISHED" && <div className="account-history-links"><Link href={`/case/${report.publicId}`}>Baca laporan <ArrowIcon/></Link>{report.entitySlug && <Link href={`/entity/${report.entitySlug}`}>Profil terlapor <ArrowIcon/></Link>}</div>}</article>; })}</div>}</div>
      </section>
      <p className="account-private-hint">Riwayat, email, bukti privat, dan catatan admin hanya terlihat oleh kamu dan tim Valrify. Halaman profil publik memiliki tampilan terpisah.</p>
      {settingsOpen && <TaskDialog open title="Pengaturan akun" className="account-settings-dialog" onClose={() => setSettingsOpen(false)} dismissOnBackdrop={false}>
        <PublicProfileSettings initialDisplayName={data.user.displayName} initialUsername={data.user.username} initialBio={data.user.bio} initialUsernameCanChangeAt={data.user.usernameCanChangeAt} onSaved={(profile) => setData((current) => current ? { ...current, user: { ...current.user, ...profile } } : current)}/>
        <section className="account-private-settings"><h2>Email akun</h2><p>{data.user.email}</p><p>{data.user.emailVerified ? "Email sudah diverifikasi." : <>Email belum diverifikasi. <Link href="/verify-email">Kirim ulang verifikasi</Link></>}</p></section>
        <details className="account-session-disclosure"><summary>Keamanan dan sesi login</summary><SessionSettings/></details>
        <button className="account-logout" type="button" disabled={loggingOut} onClick={() => void logout()}>{loggingOut ? "Memproses..." : "Keluar dari akun"}</button>
      </TaskDialog>}
    </>}
  </main><Footer/></>;
}
