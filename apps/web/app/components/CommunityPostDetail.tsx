"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CommunityComment, CommunityPost } from "../../lib/api";
import { browserApi } from "../../lib/browser-api";
import { CommunityComments } from "./CommunityComments";
import { CommunityReportDialog } from "./CommunityReportDialog";

type SessionUser = { id: string; displayName: string; role: string };

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" data-filled={filled}><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z"/></svg>;
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/></svg>;
}

function roleLabel(role: string) {
  return ({ USER: "ANGGOTA", VERIFIED_MIDDLEMAN: "VERIFIED MIDDLEMAN", MODERATOR: "MODERATOR", ADMIN: "ADMIN" } as Record<string, string>)[role] ?? role;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export function CommunityPostDetail({ initialPost, initialComments }: { initialPost: CommunityPost; initialComments: CommunityComment[] }) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [error, setError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [shareLabel, setShareLabel] = useState("BAGIKAN");

  useEffect(() => {
    browserApi<{ user: SessionUser }>("/auth/me").then(async (session) => {
      setUser(session.user);
      const [account, likeState] = await Promise.all([
        browserApi<{ user: { username: string | null } }>("/account/overview"),
        browserApi<{ likedPostIds: number[] }>("/community/posts/like-state"),
      ]);
      setUsername(account.user.username);
      setLiked(likeState.likedPostIds.includes(post.id));
    }).catch(() => setUser(null));
  }, [post.id]);

  async function toggleLike() {
    if (!user) { setError("Masuk ke akun untuk menyukai post."); return; }
    if (liking) return;
    setLiking(true);
    setError("");
    try {
      const result = await browserApi<{ liked: boolean; likeCount: number }>(`/community/posts/${post.id}/like`, { method: "POST" });
      setLiked(result.liked);
      setPost((current) => ({ ...current, likeCount: result.likeCount }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Like belum bisa disimpan."); }
    finally { setLiking(false); }
  }

  async function share() {
    const url = window.location.href.split("#", 1)[0] ?? window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `Post @${post.authorUsername} di Valrify`, text: post.body.slice(0, 120), url });
      else await navigator.clipboard.writeText(url);
      setShareLabel("LINK TERSALIN");
      window.setTimeout(() => setShareLabel("BAGIKAN"), 1800);
    } catch { setShareLabel("COBA LAGI"); }
  }

  async function remove() {
    setDeleting(true);
    setError("");
    try {
      await browserApi(`/community/posts/${post.id}`, { method: "DELETE" });
      router.replace("/community");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Post belum bisa dihapus.");
      setDeleting(false);
    }
  }

  const isOwner = user?.id === post.authorId;

  return <>
    <section className="community-post-detail-heading">
      <div><span>// POST #{post.id}</span><h1>DISKUSI<br/><b>KOMUNITAS.</b></h1></div>
      <aside><strong>BUKAN SCAM REPORT.</strong><p>Isi post adalah obrolan anggota dan tidak otomatis dianggap sebagai laporan yang sudah diperiksa admin.</p><Link href="/community">LIHAT POST LAINNYA →</Link></aside>
    </section>

    <article id={`community-post-${post.id}`} className="community-post-card community-post-detail-card">
      <header><Link className="community-post-author" href={`/u/${post.authorUsername}`}><span>{post.authorDisplayName.slice(0, 1).toUpperCase()}</span><div><strong>{post.authorDisplayName}</strong><small>@{post.authorUsername}</small></div></Link><div className="community-post-meta"><span data-role={post.authorRole}>{roleLabel(post.authorRole)}</span><time>{formatDate(post.createdAt)} WIB</time></div></header>
      <p>{post.body}</p>
      <div className="community-post-engagement community-post-detail-engagement">
        <button type="button" className={liked ? "liked" : ""} disabled={liking} onClick={() => void toggleLike()} aria-pressed={liked}><HeartIcon filled={liked}/>{post.likeCount > 0 ? `${post.likeCount} Suka` : "Suka"}</button>
        <button type="button" onClick={() => void share()}><ShareIcon/>{shareLabel}</button>
      </div>
      {error && <div className="community-error">{error}</div>}
      <footer><span>POST KOMUNITAS · BUKAN LAPORAN TERVERIFIKASI</span><div className="community-post-actions">{user && !isOwner && (reported ? <span>SUDAH DILAPORKAN</span> : <button type="button" onClick={() => setReportOpen(true)}>LAPORKAN</button>)}{isOwner && (confirmDelete ? <><button type="button" onClick={() => setConfirmDelete(false)}>BATAL</button><button type="button" disabled={deleting} onClick={() => void remove()}>{deleting ? "MENGHAPUS..." : "YA, HAPUS"}</button></> : <button type="button" onClick={() => setConfirmDelete(true)}>HAPUS</button>)}</div></footer>
      <CommunityComments postId={post.id} postAuthorId={post.authorId} initialCount={post.commentCount} topReply={null} user={user} username={username} defaultOpen initialComments={initialComments}/>
    </article>
    {reportOpen && <CommunityReportDialog kind="post" targetId={post.id} body={post.body} onClose={() => setReportOpen(false)} onReported={() => { setReported(true); setReportOpen(false); }}/>} 
  </>;
}
