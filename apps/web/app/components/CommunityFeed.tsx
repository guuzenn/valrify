"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { CommunityPost } from "../../lib/api";
import { browserApi } from "../../lib/browser-api";
import { CommunityComments } from "./CommunityComments";
import { CommunityReportDialog } from "./CommunityReportDialog";

type SessionUser = { id: string; displayName: string; role: string };
type FeedSort = "latest" | "popular";

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" data-filled={filled}><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z"/></svg>;
}

function TrendIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16 5-5 4 4 7-8m-5 0h5v5"/></svg>;
}

function roleLabel(role: string) {
  return ({ USER: "ANGGOTA", VERIFIED_MIDDLEMAN: "VERIFIED MIDDLEMAN", MODERATOR: "MODERATOR", ADMIN: "ADMIN" } as Record<string, string>)[role] ?? role;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export function CommunityFeed({ initialPosts }: { initialPosts: CommunityPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reportPost, setReportPost] = useState<CommunityPost | null>(null);
  const [reportedIds, setReportedIds] = useState<number[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<number[]>([]);
  const [likingPostIds, setLikingPostIds] = useState<number[]>([]);
  const [sort, setSort] = useState<FeedSort>("latest");
  const [sorting, setSorting] = useState(false);

  useEffect(() => {
    browserApi<{ user: SessionUser }>("/auth/me")
      .then(async (session) => {
        setUser(session.user);
        const [account, likeState] = await Promise.all([
          browserApi<{ user: { username: string | null } }>("/account/overview"),
          browserApi<{ likedPostIds: number[] }>("/community/posts/like-state"),
        ]);
        setUsername(account.user.username);
        setLikedPostIds(likeState.likedPostIds);
      })
      .catch(() => setUser(null))
      .finally(() => setSessionReady(true));
  }, []);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPosting(true);
    setError("");
    try {
      const post = await browserApi<CommunityPost>("/community/posts", { method: "POST", body: JSON.stringify({ body }) });
      setPosts((current) => [post, ...current]);
      setBody("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Post belum bisa dikirim.");
    } finally {
      setPosting(false);
    }
  }

  async function remove(postId: number) {
    setDeletingId(postId);
    setError("");
    try {
      await browserApi(`/community/posts/${postId}`, { method: "DELETE" });
      setPosts((current) => current.filter((post) => post.id !== postId));
      setConfirmDeleteId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Post belum bisa dihapus.");
    } finally {
      setDeletingId(null);
    }
  }

  async function changeSort(next: FeedSort) {
    if (next === sort || sorting) return;
    setSorting(true);
    setError("");
    try {
      setPosts(await browserApi<CommunityPost[]>(`/community/posts?sort=${next}`));
      setSort(next);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Urutan feed belum bisa diganti."); }
    finally { setSorting(false); }
  }

  async function togglePostLike(postId: number) {
    if (!user) { setError("Masuk ke akun untuk menyukai post."); return; }
    if (likingPostIds.includes(postId)) return;
    setLikingPostIds((current) => [...current, postId]);
    setError("");
    try {
      const result = await browserApi<{ liked: boolean; likeCount: number }>(`/community/posts/${postId}/like`, { method: "POST" });
      setLikedPostIds((current) => result.liked ? [...current.filter((id) => id !== postId), postId] : current.filter((id) => id !== postId));
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, likeCount: result.likeCount } : post));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Like post belum bisa disimpan."); }
    finally { setLikingPostIds((current) => current.filter((id) => id !== postId)); }
  }

  const canRemove = (post: CommunityPost) => user?.id === post.authorId;

  return <><div className="community-layout">
    <aside className="community-sidebar">
      <div><span>// COMMUNITY</span><h1>NGOBROL<br/><b>BARENG.</b></h1><p>Bagikan pengalaman, tips transaksi, atau diskusi seputar jual beli akun Valorant.</p></div>
      <form action="/community/search" className="community-quick-search"><label htmlFor="community-quick-q">CARI DI COMMUNITY</label><div><input id="community-quick-q" name="q" minLength={2} maxLength={80} required placeholder="Post atau username..."/><button type="submit" aria-label="Cari di Community">→</button></div></form>
      <div className="community-rules"><strong>SEBELUM POSTING</strong><p>Jangan bagikan data pribadi atau membuat tuduhan baru di sini. Untuk melaporkan scam, gunakan form laporan dan sertakan bukti.</p><Link href="/submit">LAPOR SCAM →</Link></div>
    </aside>
    <section className="community-main">
      {!sessionReady ? <div className="community-session-loading">MEMERIKSA SESI...</div> : !user ? <div className="community-login-callout"><div><strong>IKUT OBROLAN KOMUNITAS.</strong><p>Masuk untuk menulis post. Semua orang tetap dapat membaca feed ini.</p></div><Link href="/login">MASUK →</Link></div> : !username ? <div className="community-login-callout username"><div><strong>BUAT USERNAME DULU.</strong><p>Post komunitas memakai identitas publik, bukan email akunmu.</p></div><Link href="/account">ATUR DI AKUN SAYA →</Link></div> : <form className="community-composer" onSubmit={(event) => void publish(event)}>
        <div className="community-composer-head"><div className="community-mini-avatar">{user.displayName.slice(0, 1).toUpperCase()}</div><div><strong>{user.displayName}</strong><span>@{username}</span></div><small>POST PUBLIK</small></div>
        <textarea required minLength={3} maxLength={1000} rows={5} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Mau berbagi apa ke komunitas?"/>
        <div className="community-composer-footer"><span>{body.length}/1000</span><button type="submit" disabled={posting || body.trim().length < 3}>{posting ? "MENERBITKAN..." : "POST SEKARANG →"}</button></div>
      </form>}
      {error && <p className="community-error">{error}</p>}
      <div className="community-feed-heading"><div><span>{sort === "latest" ? "// FEED TERBARU" : "// 30 HARI TERAKHIR"}</span><h2>{sort === "latest" ? "POST KOMUNITAS." : "LAGI RAMAI."}</h2></div><strong>{posts.length} POST</strong></div>
      <div className="community-feed-sort" role="tablist" aria-label="Urutan post"><button type="button" role="tab" aria-selected={sort === "latest"} disabled={sorting} onClick={() => void changeSort("latest")}>TERBARU</button><button type="button" role="tab" aria-selected={sort === "popular"} disabled={sorting} onClick={() => void changeSort("popular")}><TrendIcon/>LAGI RAMAI</button></div>
      {posts.length === 0 ? <div className="community-empty"><strong>BELUM ADA POST.</strong><p>Jadilah orang pertama yang membuka obrolan komunitas Valrify.</p></div> : <div className={`community-post-list ${sorting ? "is-sorting" : ""}`}>{posts.map((post, index) => <article id={`community-post-${post.id}`} className="community-post-card" key={post.id}>
        <header><Link className="community-post-author" href={`/u/${post.authorUsername}`}><span>{post.authorDisplayName.slice(0, 1).toUpperCase()}</span><div><strong>{post.authorDisplayName}</strong><small>@{post.authorUsername}</small></div></Link><div className="community-post-meta">{sort === "popular" && index < 3 && (post.likeCount > 0 || post.commentCount > 0) && <b>#{index + 1} RAMAI</b>}<span data-role={post.authorRole}>{roleLabel(post.authorRole)}</span><time>{formatDate(post.createdAt)}</time></div></header>
        <p>{post.body}</p>
        <div className="community-post-engagement"><button type="button" className={likedPostIds.includes(post.id) ? "liked" : ""} disabled={likingPostIds.includes(post.id)} onClick={() => void togglePostLike(post.id)} aria-pressed={likedPostIds.includes(post.id)}><HeartIcon filled={likedPostIds.includes(post.id)}/>{post.likeCount > 0 ? `${post.likeCount} Suka` : "Suka"}</button><Link className="community-post-open" href={`/community/post/${post.id}`}>BUKA POST →</Link></div>
        <footer><span>POST KOMUNITAS · BUKAN LAPORAN TERVERIFIKASI</span><div className="community-post-actions">{user && user.id !== post.authorId && (reportedIds.includes(post.id) ? <span>SUDAH DILAPORKAN</span> : <button type="button" onClick={() => { setReportPost(post); setError(""); }}>LAPORKAN</button>)}{canRemove(post) && (confirmDeleteId === post.id ? <><button type="button" onClick={() => setConfirmDeleteId(null)}>BATAL</button><button type="button" disabled={deletingId === post.id} onClick={() => void remove(post.id)}>{deletingId === post.id ? "MENGHAPUS..." : "YA, HAPUS"}</button></> : <button type="button" onClick={() => setConfirmDeleteId(post.id)}>HAPUS</button>)}</div></footer><CommunityComments postId={post.id} postAuthorId={post.authorId} initialCount={post.commentCount} topReply={post.topReply} user={user} username={username}/>
      </article>)}</div>}
    </section>
  </div>{reportPost && <CommunityReportDialog kind="post" targetId={reportPost.id} body={reportPost.body} onClose={() => setReportPost(null)} onReported={() => { setReportedIds((current) => [...current, reportPost.id]); setReportPost(null); }}/>}</>;
}
