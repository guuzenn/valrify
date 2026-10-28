"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserApi } from "../../../lib/browser-api";
import { AdminFeedback, AdminPageHeader, AdminPagination, adminActionLabels, adminDate, adminRoleLabels } from "../../components/AdminUi";

type ActivityRow = { id: number; action: string; rationale: string; createdAt: string; actorName: string; reportPublicId: string | null; communityPostId: number | null; communityCommentId: number | null; details: { targetName?: string; targetUserId?: string; before?: unknown; after?: unknown } | null };
export default function ActivityPage() {
  const [data, setData] = useState<{ rows: ActivityRow[]; total: number } | null>(null), [page, setPage] = useState(1), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true; setLoading(true); setError("");
    browserApi<{ rows: ActivityRow[]; total: number }>(`/admin/activity?page=${page}`).then(result => { if (active) setData(result); }).catch(reason => { if (active) { setData(null); setError(reason instanceof Error ? reason.message : "Riwayat gagal dimuat."); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);
  return <main className="operations-page"><AdminPageHeader label="Jejak keputusan" title="RIWAYAT AKTIVITAS." description="Catatan perubahan role, direktori rekber, dan keputusan moderasi. Riwayat ini hanya dapat dibaca melalui panel."/><AdminFeedback message={error}/>{loading && <p role="status">Memuat aktivitas...</p>}{data && <section className="operations-card"><ol className="operations-audit-list">{data.rows.map(row => <li key={row.id}><div><span className="operations-badge">{adminActionLabels[row.action] ?? row.action}</span><time>{adminDate(row.createdAt)}</time></div><h2>{row.details?.targetName ?? row.reportPublicId ?? (row.communityPostId ? `Community post #${row.communityPostId}` : row.communityCommentId ? `Komentar #${row.communityCommentId}` : "Keputusan moderasi")}</h2>{row.action === "USER_ROLE_CHANGED" && <p>{adminRoleLabels[String(row.details?.before)]} → {adminRoleLabels[String(row.details?.after)]}</p>}<p>{row.rationale}</p><small>Oleh {row.actorName}</small>{row.details?.targetUserId && <Link href="/admin/users">Buka pengelolaan pengguna</Link>}{row.reportPublicId && <Link href="/admin/reports">Buka antrean laporan</Link>}</li>)}</ol>{!data.rows.length && <p className="operations-empty">Belum ada aktivitas yang tercatat.</p>}<AdminPagination page={page} total={data.total} disabled={loading} onPage={setPage}/></section>}</main>;
}
