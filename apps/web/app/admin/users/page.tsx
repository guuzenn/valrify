"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { roles } from "@valrify/domain";
import { adminRoleSchema, type AdminRoleInput } from "@valrify/validation";
import { browserApi } from "../../../lib/browser-api";
import { Select } from "../../components/Select";
import { AdminFeedback, AdminPageHeader, AdminPagination, adminDate, adminRoleDescriptions, adminRoleLabels } from "../../components/AdminUi";

type UserRow = { id: string; displayName: string; email: string; username: string | null; role: string; emailVerifiedAt: string | null; createdAt: string; mfaEnabled: boolean };
type UserList = { rows: UserRow[]; total: number; page: number };
type UserDetail = { user: Omit<UserRow, "mfaEnabled">; reportCount: number; reports: Array<{ publicId: string; title: string; status: string; createdAt: string }> };

export default function AdminUsersPage() {
  const [data, setData] = useState<UserList | null>(null);
  const [search, setSearch] = useState(""), [query, setQuery] = useState(""), [filter, setFilter] = useState("ALL"), [page, setPage] = useState(1);
  const [selected, setSelected] = useState<UserDetail | null>(null), [detailLoading, setDetailLoading] = useState(false);
  const [role, setRole] = useState("USER"), [rationale, setRationale] = useState("");
  const [pending, setPending] = useState<AdminRoleInput | null>(null), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const [actorId, setActorId] = useState(""), [refresh, setRefresh] = useState(0), [loading, setLoading] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
  useEffect(() => { if (selected) { detailRef.current?.focus({ preventScroll: true }); detailRef.current?.scrollIntoView({ block: "start" }); } }, [selected?.user.id]);
  useEffect(() => { browserApi<{ user: { id: string } }>("/auth/me").then(result => setActorId(result.user.id)).catch(() => {}); }, []);
  useEffect(() => {
    let active = true; setLoading(true); setError("");
    const params = new URLSearchParams({ q: query, page: String(page), ...(filter === "ALL" ? {} : { role: filter }) });
    browserApi<UserList>(`/admin/users?${params}`).then(result => { if (active) setData(result); }).catch(reason => { if (active) { setData(null); setError(reason instanceof Error ? reason.message : "Daftar pengguna gagal dimuat."); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, filter, page, refresh]);

  const select = useCallback(async (id: string) => {
    setSelected(null); setPending(null); setRationale(""); setError(""); setMessage(""); setDetailLoading(true);
    try { const detail = await browserApi<UserDetail>(`/admin/users/${encodeURIComponent(id)}`); setSelected(detail); setRole(detail.user.role); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Detail pengguna gagal dimuat."); }
    finally { setDetailLoading(false); }
  }, []);

  function prepare(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    if (!selected) return;
    const parsed = adminRoleSchema.safeParse({ role, expectedRole: selected.user.role, rationale });
    if (!parsed.success) { setError(parsed.error.issues.map(issue => issue.message).join(" ")); return; }
    if (role === selected.user.role) { setError("Pilih role yang berbeda."); return; }
    setError(""); setPending(parsed.data);
  }

  async function save() {
    if (!pending || !selected) return;
    setBusy(true); setError("");
    try {
      await browserApi(`/admin/users/${encodeURIComponent(selected.user.id)}/role`, { method: "PATCH", body: JSON.stringify(pending) });
      setSelected({ ...selected, user: { ...selected.user, role: pending.role } }); setPending(null); setRationale("");
      setMessage("Role berhasil diubah. Seluruh sesi pengguna tersebut telah diakhiri; pengguna perlu login kembali."); setRefresh(value => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Role gagal diubah."); setPending(null); }
    finally { setBusy(false); }
  }

  return <main className="operations-page">
    <AdminPageHeader label="Akses & identitas" title="PENGGUNA & ROLE." description="Cari akun, periksa kontribusinya, dan berikan akses sesuai tanggung jawab."/>
    <AdminFeedback message={error}/><AdminFeedback message={message} error={false}/>
    <form className="operations-filters" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(1); }}><label>Cari pengguna<input value={search} onChange={event => setSearch(event.target.value)} maxLength={100} placeholder="Nama, email, atau username"/></label><label>Role<Select label="Filter role" value={filter} onValueChange={value => { setFilter(value); setPage(1); }}><option value="ALL">Semua role</option>{roles.map(value => <option value={value} key={value}>{adminRoleLabels[value]}</option>)}</Select></label><button className="tactical-button" type="submit" disabled={loading}>CARI PENGGUNA</button></form>
    {loading && <p role="status">Memuat pengguna...</p>}
    <div className="operations-management-grid">
      <section className="operations-card"><div className="operations-card-title"><p className="eyebrow">// DIREKTORI PENGGUNA</p><h2>{data?.total ?? 0} AKUN.</h2></div><div className="operations-table-scroll"><table className="operations-table"><thead><tr><th>Pengguna</th><th>Role</th><th>Verifikasi</th><th>Aksi</th></tr></thead><tbody>{data?.rows.map(user => <tr key={user.id} data-selected={selected?.user.id === user.id}><td><strong>{user.displayName}</strong><span>{user.email}</span><small>{user.username ? `@${user.username}` : "Belum ada username"}{user.id === actorId ? " · Akunmu" : ""}</small></td><td><span className="operations-badge" data-role={user.role}>{adminRoleLabels[user.role]}</span></td><td><span>{user.emailVerifiedAt ? "Email terverifikasi" : "Email belum diverifikasi"}</span><small>{user.mfaEnabled ? "MFA terpasang" : "MFA belum terpasang"}</small></td><td><button type="button" disabled={busy || detailLoading} onClick={() => void select(user.id)}>KELOLA</button></td></tr>)}</tbody></table></div>{!loading && data?.rows.length === 0 && <p className="operations-empty">Tidak ada pengguna yang cocok.</p>}{data && <AdminPagination page={page} total={data.total} disabled={loading || busy} onPage={setPage}/>}</section>
      <section className="operations-card operations-user-detail" aria-label="Detail pengguna" ref={detailRef} tabIndex={-1}>{detailLoading ? <p role="status">Memuat detail...</p> : !selected ? <><p className="eyebrow">// DETAIL AKUN</p><h2>PILIH PENGGUNA.</h2><p>Klik Kelola untuk melihat kontribusi dan mengatur role akun.</p></> : <>
        <p className="eyebrow">// DETAIL AKUN</p><h2>{selected.user.displayName}</h2><p>{selected.user.email}</p><small>Bergabung {adminDate(selected.user.createdAt)}</small>
        {selected.user.id === actorId ? <p className="operations-inline-note">Ini akun yang sedang kamu gunakan. Role akun sendiri tidak dapat diubah dari panel ini.</p> : <form className="operations-form" onSubmit={prepare} noValidate><label>Role pengguna<Select label="Role pengguna" value={role} disabled={busy || Boolean(pending)} onValueChange={setRole}>{roles.map(value => <option value={value} key={value}>{adminRoleLabels[value]}</option>)}</Select></label><p className="operations-inline-note">{adminRoleDescriptions[role]}</p><label>Alasan perubahan role<textarea rows={3} value={rationale} maxLength={1000} disabled={busy || Boolean(pending)} onChange={event => setRationale(event.target.value)} placeholder="Minimal 10 karakter"/></label>{pending ? <div className="operations-confirm"><strong>UBAH ROLE PENGGUNA INI?</strong><p>{adminRoleLabels[selected.user.role]} → {adminRoleLabels[pending.role]}</p><p>Seluruh sesi pengguna ini akan diakhiri. {adminRoleDescriptions[pending.role]}</p><div><button type="button" disabled={busy} onClick={() => setPending(null)}>BATAL</button><button type="button" className="tactical-button" disabled={busy} onClick={() => void save()}>{busy ? "MENYIMPAN..." : "YA, UBAH ROLE"}</button></div></div> : <button className="tactical-button" disabled={busy} type="submit">TINJAU PERUBAHAN</button>}</form>}
        <div className="operations-contributions"><h3>{selected.reportCount} LAPORAN DIKIRIM</h3><p>Menampilkan maksimal 20 kiriman terbaru.</p>{selected.reports.map(report => <article key={report.publicId}><strong>{report.publicId}</strong><p>{report.title}</p><small>{report.status} · {adminDate(report.createdAt)}</small></article>)}</div>
      </>}</section>
    </div>
  </main>;
}
