"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { browserApi } from "../../../lib/browser-api";
import { CommunityModerationActions } from "../../components/CommunityModerationActions";
import { Footer, Header } from "../../components/SiteChrome";

type ReportDetail = { id: number; reason: string; detail: string; createdAt: string; reporterName: string };
type Author = { id: string; displayName: string; username: string | null; role: string };
type PostQueueItem = { postId: number; body: string; postCreatedAt: string; firstReportedAt: string; reportCount: number; author: Author; reports: ReportDetail[] };
type CommentQueueItem = { commentId: number; body: string; commentCreatedAt: string; postId: number; postBody: string; firstReportedAt: string; reportCount: number; author: Author; reports: ReportDetail[] };
type Tab = "posts" | "comments";

const reasonLabels: Record<string, string> = { SPAM: "SPAM / PROMOSI", HARASSMENT: "PELECEHAN", PERSONAL_DATA: "DATA PRIBADI", SCAM_ACCUSATION: "TUDUHAN SCAM", OTHER: "LAINNYA" };
function formatDate(value: string) { return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value)); }

function Reports({ reports }: { reports: ReportDetail[] }) {
  return <div className="community-admin-reports"><span>// ALASAN DARI PELAPOR</span>{reports.map((report) => <section key={report.id}><div><strong>{reasonLabels[report.reason] ?? report.reason}</strong><time>{formatDate(report.createdAt)}</time></div><p>{report.detail}</p><small>Dilaporkan oleh {report.reporterName} · nama hanya bisa dilihat admin</small></section>)}</div>;
}

function AuthorRow({ author }: { author: Author }) {
  const role = ({ USER: "PENGGUNA", VERIFIED_MIDDLEMAN: "REKBER TERVERIFIKASI", MODERATOR: "MODERATOR", ADMIN: "ADMIN" } as Record<string, string>)[author.role] ?? author.role;
  return <div className="community-admin-author"><div className="community-mini-avatar">{author.displayName.slice(0, 1).toUpperCase()}</div><div><strong>{author.displayName}</strong><span>{author.username ? `@${author.username}` : "Tanpa username"} · {role}</span></div>{author.username && <Link href={`/u/${author.username}`} target="_blank">BUKA PROFIL ↗</Link>}</div>;
}

export default function CommunityModerationPage() {
  const [posts, setPosts] = useState<PostQueueItem[] | null>(null);
  const [comments, setComments] = useState<CommentQueueItem[] | null>(null);
  const [tab, setTab] = useState<Tab>("posts");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true); setError("");
    try {
      const [postRows, commentRows] = await Promise.all([browserApi<PostQueueItem[]>("/admin/community-post-reports"), browserApi<CommentQueueItem[]>("/admin/community-comment-reports")]);
      setPosts(postRows); setComments(commentRows);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Antrean belum bisa dimuat."); }
    finally { setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const loading = posts === null || comments === null;
  const total = (posts?.length ?? 0) + (comments?.length ?? 0);
  const activeItems = tab === "posts" ? posts ?? [] : comments ?? [];

  return <><Header compact backHref="/admin/reports" backLabel="Kembali ke panel admin"/><main className="page shell community-admin-page">
    <div className="community-admin-bar"><Link href="/admin/reports">← PANEL ADMIN</Link><Link href="/community" target="_blank">BUKA COMMUNITY ↗</Link><button type="button" disabled={refreshing} onClick={() => void load()}>{refreshing ? "MEMUAT..." : "MUAT ULANG"}</button></div>
    <section className="community-admin-hero"><div><p className="eyebrow">// LAPORAN COMMUNITY</p><h1>ANTREAN<br/>LAPORAN.</h1><p>Periksa laporan post dan komentar tanpa menampilkan identitas pelapor. Satu keputusan akan menyelesaikan semua laporan pada konten yang sama.</p></div><div><strong>{total}</strong><span>KONTEN PERLU DICEK</span></div></section>
    {error ? <div className="admin-access-error"><span>AKSES TERBATAS</span><h2>ANTREAN TIDAK DAPAT DIBUKA.</h2><p>{error}</p><Link href="/login" className="tactical-button">MASUK SEBAGAI ADMIN</Link></div> : loading ? <div className="admin-loading"><span/><p>MEMUAT LAPORAN COMMUNITY...</p></div> : <>
      <div className="community-admin-tabs"><button type="button" aria-selected={tab === "posts"} onClick={() => setTab("posts")}>POST DILAPORKAN <strong>{posts.length}</strong></button><button type="button" aria-selected={tab === "comments"} onClick={() => setTab("comments")}>KOMENTAR DILAPORKAN <strong>{comments.length}</strong></button></div>
      {activeItems.length === 0 ? <div className="community-admin-empty"><strong>TIDAK ADA {tab === "posts" ? "POST" : "KOMENTAR"} YANG PERLU DICEK.</strong><p>Belum ada laporan yang menunggu keputusan.</p></div> : tab === "posts" ? <div className="community-admin-list">{posts.map((item) => <article key={item.postId} className="community-admin-card"><header><div><span>POST #{item.postId}</span><strong>{item.reportCount} LAPORAN</strong></div><time>Laporan pertama {formatDate(item.firstReportedAt)}</time></header><AuthorRow author={item.author}/><blockquote>{item.body}</blockquote><Reports reports={item.reports}/><CommunityModerationActions targetId={item.postId} kind="post" onDone={() => void load()}/></article>)}</div> : <div className="community-admin-list">{comments.map((item) => <article key={item.commentId} className="community-admin-card comment"><header><div><span>KOMENTAR #{item.commentId}</span><strong>{item.reportCount} LAPORAN</strong></div><time>Laporan pertama {formatDate(item.firstReportedAt)}</time></header><AuthorRow author={item.author}/><blockquote>{item.body}</blockquote><div className="community-admin-parent"><span>DI POST #{item.postId}</span><p>{item.postBody}</p></div><Reports reports={item.reports}/><CommunityModerationActions targetId={item.commentId} kind="comment" onDone={() => void load()}/></article>)}</div>}
    </>}
  </main><Footer/></>;
}
