"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { CommunityComment, CommunityPost } from "../../lib/api";
import { browserApi } from "../../lib/browser-api";
import { CommunityReportDialog } from "./CommunityReportDialog";

type SessionUser = { id: string; displayName: string; role: string };
type CommentState = { likedCommentIds: number[] };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function CommentIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 9 9 0 0 1-3.7-.8L4 20l1.3-3.8A7.4 7.4 0 0 1 4 12a7.5 7.5 0 0 1 8-7.5 7.5 7.5 0 0 1 8 7Z"/></svg>; }
function HeartIcon({ filled = false }: { filled?: boolean }) { return <svg viewBox="0 0 24 24" aria-hidden="true" data-filled={filled}><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z"/></svg>; }
function ReplyIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 17-5-5 5-5M4 12h9a7 7 0 0 1 7 7"/></svg>; }
function FlagIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4m0 0h10l-1.5 3L17 10H5"/></svg>; }

export function CommunityComments({ postId, postAuthorId, initialCount, topReply, user, username, defaultOpen = false, initialComments }: { postId: number; postAuthorId: string; initialCount: number; topReply: CommunityPost["topReply"]; user: SessionUser | null; username: string | null; defaultOpen?: boolean; initialComments?: CommunityComment[] }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stateLoadedForUser = useRef<string | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [comments, setComments] = useState<CommunityComment[] | null>(initialComments ?? null);
  const [count, setCount] = useState(initialCount);
  const [preview, setPreview] = useState(topReply);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [replyingTo, setReplyingTo] = useState<CommunityComment | null>(null);
  const [likedIds, setLikedIds] = useState<number[]>([]);
  const [likingIds, setLikingIds] = useState<number[]>([]);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [reportedIds, setReportedIds] = useState<number[]>([]);
  const [reportComment, setReportComment] = useState<CommunityComment | null>(null);

  useEffect(() => {
    if (!open) return;
    const needsThread = comments === null;
    const needsState = Boolean(user && stateLoadedForUser.current !== user.id);
    if (!needsThread && !needsState) return;
    let cancelled = false;
    if (needsThread) setLoading(true);
    setError("");
    Promise.all([
      needsThread ? browserApi<CommunityComment[]>(`/community/posts/${postId}/comments`) : Promise.resolve(null),
      needsState ? browserApi<CommentState>(`/community/posts/${postId}/comment-state`) : Promise.resolve(null),
    ]).then(([thread, state]) => {
      if (cancelled) return;
      if (thread) setComments(thread);
      if (state && user) { setLikedIds(state.likedCommentIds); stateLoadedForUser.current = user.id; }
    }).catch((reason) => {
      if (cancelled) return;
      setError(reason instanceof Error ? reason.message : "Komentar belum bisa dimuat.");
      if (needsThread) setComments([]);
    }).finally(() => { if (!cancelled && needsThread) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, postId, user, comments]);

  function toggle() { setOpen((current) => !current); }

  function startReply(comment: CommunityComment) {
    if (!user) { setError("Masuk ke akun untuk membalas komentar."); return; }
    if (!username) { setError("Buat username publik di Akun Saya sebelum membalas."); return; }
    setError("");
    setReplyingTo(comment);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPosting(true);
    setError("");
    try {
      const comment = await browserApi<CommunityComment>(`/community/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ body, replyToCommentId: replyingTo?.id ?? null }) });
      setComments((current) => [...(current ?? []), comment]);
      setCount((value) => value + 1);
      setPreview((current) => current ?? { id: comment.id, postId: comment.postId, body: comment.body, createdAt: comment.createdAt, authorId: comment.authorId, authorDisplayName: comment.authorDisplayName, authorUsername: comment.authorUsername, likeCount: comment.likeCount });
      setBody("");
      setReplyingTo(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Komentar belum bisa dikirim."); }
    finally { setPosting(false); }
  }

  async function toggleLike(commentId: number) {
    if (!user) { setError("Masuk ke akun untuk menyukai komentar."); return; }
    if (likingIds.includes(commentId)) return;
    setLikingIds((current) => [...current, commentId]);
    setError("");
    try {
      const result = await browserApi<{ liked: boolean; likeCount: number }>(`/community/comments/${commentId}/like`, { method: "POST" });
      setLikedIds((current) => result.liked ? [...current.filter((id) => id !== commentId), commentId] : current.filter((id) => id !== commentId));
      setComments((current) => (current ?? []).map((comment) => comment.id === commentId ? { ...comment, likeCount: result.likeCount } : comment));
      setPreview((current) => current?.id === commentId ? { ...current, likeCount: result.likeCount } : current);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Like belum bisa disimpan."); }
    finally { setLikingIds((current) => current.filter((id) => id !== commentId)); }
  }

  function jumpToComment(commentId: number) {
    document.getElementById(`community-comment-${commentId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedId(commentId);
    window.setTimeout(() => setHighlightedId((current) => current === commentId ? null : current), 1600);
  }

  async function remove(commentId: number) {
    setError("");
    try {
      await browserApi(`/community/comments/${commentId}`, { method: "DELETE" });
      setComments((current) => (current ?? []).filter((comment) => comment.id !== commentId));
      setCount((value) => Math.max(0, value - 1));
      setPreview((current) => current?.id === commentId ? null : current);
      if (replyingTo?.id === commentId) setReplyingTo(null);
      setConfirmDeleteId(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Komentar belum bisa dihapus."); }
  }

  const commentById = new Map((comments ?? []).map((comment) => [comment.id, comment]));

  return <section className="community-comments">
    {!open && preview && <article className="community-top-reply"><header><Link href={`/u/${preview.authorUsername}`}><span className="community-comment-avatar">{preview.authorDisplayName.slice(0, 1).toUpperCase()}</span><div><span className="community-comment-name"><strong>{preview.authorDisplayName}</strong>{preview.authorId === postAuthorId && <b>PENULIS</b>}</span><small>@{preview.authorUsername}</small></div></Link><span>BALASAN TERATAS</span></header><p>{preview.body}</p>{preview.likeCount > 0 && <small><HeartIcon filled/> {preview.likeCount} suka</small>}</article>}
    <button className="community-comments-toggle" type="button" aria-expanded={open} onClick={toggle}><CommentIcon/><strong>{open ? "SEMBUNYIKAN BALASAN" : count > 0 ? `LIHAT SEMUA ${count} BALASAN` : "TULIS BALASAN"}</strong><b>{open ? "TUTUP" : "BUKA"}</b></button>
    {open && <div className="community-comments-thread">
      {user && username ? <form className="community-comment-form" onSubmit={(event) => void submit(event)}>{replyingTo && <div className="community-replying-to"><span>Membalas <strong>@{replyingTo.authorUsername}</strong></span><button type="button" onClick={() => setReplyingTo(null)} aria-label="Batalkan balasan">×</button></div>}<div><span className="community-comment-avatar">{user.displayName.slice(0, 1).toUpperCase()}</span><textarea ref={textareaRef} required minLength={2} maxLength={500} rows={2} value={body} onChange={(event) => setBody(event.target.value)} placeholder={replyingTo ? `Balas @${replyingTo.authorUsername}...` : "Tulis komentar..."}/></div><footer><span>{body.length}/500</span><button type="submit" disabled={posting || body.trim().length < 2}>{posting ? "MENGIRIM..." : replyingTo ? "BALAS →" : "KIRIM →"}</button></footer></form> : user ? <p className="community-comment-gate">Buat <Link href="/account">username publik</Link> sebelum menulis komentar.</p> : <p className="community-comment-gate"><Link href="/login">Masuk</Link> untuk ikut berkomentar.</p>}
      {error && <p className="community-comment-error">{error}</p>}
      {loading ? <p className="community-comments-loading">MEMUAT KOMENTAR...</p> : comments?.length === 0 ? <p className="community-comments-empty">Belum ada komentar. Mulai obrolannya.</p> : <div className="community-comment-list">{comments?.map((comment) => {
        const replyTarget = comment.replyToCommentId ? commentById.get(comment.replyToCommentId) : null;
        const liked = likedIds.includes(comment.id);
        return <article id={`community-comment-${comment.id}`} className={highlightedId === comment.id ? "is-highlighted" : ""} key={comment.id}><header><Link href={`/u/${comment.authorUsername}`}><span className="community-comment-avatar">{comment.authorDisplayName.slice(0, 1).toUpperCase()}</span><div><span className="community-comment-name"><strong>{comment.authorDisplayName}</strong>{comment.authorId === postAuthorId && <b>PENULIS</b>}</span><small>@{comment.authorUsername}</small></div></Link><time>{formatDate(comment.createdAt)}</time></header>{comment.replyToCommentId && (replyTarget ? <button className="community-reply-context" type="button" onClick={() => jumpToComment(replyTarget.id)}><ReplyIcon/> Membalas <strong>@{replyTarget.authorUsername}</strong></button> : <span className="community-reply-context removed"><ReplyIcon/> Komentar yang dibalas sudah dihapus</span>)}<p>{comment.body}</p><footer className="community-comment-actions"><button type="button" className={liked ? "liked" : ""} disabled={likingIds.includes(comment.id)} onClick={() => void toggleLike(comment.id)} aria-pressed={liked}><HeartIcon filled={liked}/>{comment.likeCount > 0 ? `${comment.likeCount} Suka` : "Suka"}</button><button type="button" onClick={() => startReply(comment)}><ReplyIcon/>Balas</button>{user?.id === comment.authorId ? (confirmDeleteId === comment.id ? <div className="community-comment-delete-confirm"><button type="button" onClick={() => setConfirmDeleteId(null)}>Batal</button><button type="button" onClick={() => void remove(comment.id)}>Ya, hapus</button></div> : <button className="danger" type="button" onClick={() => setConfirmDeleteId(comment.id)}>Hapus</button>) : user && (reportedIds.includes(comment.id) ? <span>Sudah dilaporkan</span> : <button className="muted" type="button" onClick={() => setReportComment(comment)}><FlagIcon/>Laporkan</button>)}</footer></article>;
      })}</div>}
    </div>}
    {reportComment && <CommunityReportDialog kind="comment" targetId={reportComment.id} body={reportComment.body} onClose={() => setReportComment(null)} onReported={() => { setReportedIds((current) => [...current, reportComment.id]); setReportComment(null); }}/>} 
  </section>;
}
