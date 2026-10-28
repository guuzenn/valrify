"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { middlemanDirectorySchema, type MiddlemanDirectoryInput } from "@valrify/validation";
import { browserApi } from "../../../lib/browser-api";
import { AdminFeedback, AdminPageHeader } from "../../components/AdminUi";
import { ArrowIcon } from "../../components/ArrowIcon";

type DirectoryRow = Omit<MiddlemanDirectoryInput, "rationale"> & { id: number; updatedAt: string };
const empty: MiddlemanDirectoryInput = { displayName: "", description: "", profileUrl: "", contactUrl: "", feeInfo: "", sortOrder: 0, isPublished: false, isSponsored: false, rationale: "" };

export default function AdminDirectoryPage() {
  const [rows, setRows] = useState<DirectoryRow[] | null>(null), [editing, setEditing] = useState<DirectoryRow | null>(null);
  const [draft, setDraft] = useState<MiddlemanDirectoryInput>(empty), [pending, setPending] = useState<MiddlemanDirectoryInput | null>(null);
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLElement>(null);
  const load = useCallback(async () => {
    try { setRows(await browserApi<DirectoryRow[]>("/admin/directory")); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Direktori gagal dimuat."); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  function edit(row: DirectoryRow | null) {
    setEditing(row); setDraft(row ? { displayName: row.displayName, description: row.description, profileUrl: row.profileUrl, contactUrl: row.contactUrl, feeInfo: row.feeInfo, sortOrder: row.sortOrder, isPublished: row.isPublished, isSponsored: row.isSponsored, rationale: "" } : empty); setPending(null); setMessage(""); setError("");
    formRef.current?.focus({ preventScroll: true }); formRef.current?.scrollIntoView({ block: "start" });
  }
  function prepare(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    const result = middlemanDirectorySchema.safeParse(draft);
    if (!result.success) { setError(result.error.issues.map(issue => issue.message).join(" ")); return; }
    setError(""); setPending(result.data);
  }
  async function save() {
    if (!pending) return;
    setBusy(true); setError("");
    try {
      const saved = await browserApi<DirectoryRow>(editing ? `/admin/directory/${editing.id}` : "/admin/directory", { method: editing ? "PATCH" : "POST", body: JSON.stringify({ ...pending, ...(editing ? { updatedAt: editing.updatedAt } : {}) }) });
      setEditing(saved); setDraft({ ...pending, rationale: "" }); setPending(null); await load();
      setMessage(saved.isPublished ? "Profil rekber disimpan dan tampil di halaman publik." : "Profil disimpan sebagai draft dan tidak tampil di halaman publik.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Profil gagal disimpan."); setPending(null); }
    finally { setBusy(false); }
  }
  return <main className="operations-page">
    <AdminPageHeader label="Kurasi & penempatan" title="DIREKTORI REKBER." description="Kelola profil dan kontak yang tampil di halaman rekber. Penempatan di direktori tidak mengubah role atau hak publikasi akun."><button type="button" disabled={busy} onClick={() => edit(null)}>TAMBAH REKBER</button><a href="/rekber" target="_blank" rel="noreferrer">LIHAT HALAMAN PUBLIK <ArrowIcon/></a></AdminPageHeader>
    <AdminFeedback message={error}/><AdminFeedback message={message} error={false}/>
    <div className="operations-management-grid">
      <section className="operations-card"><p className="eyebrow">// PROFIL REKBER</p><h2>{rows?.length ?? 0} PROFIL.</h2>{rows === null ? !error && <p role="status">Memuat direktori...</p> : !rows.length ? <p className="operations-empty">Belum ada profil. Mulai dengan menambahkan draft rekber.</p> : <div className="operations-directory-list">{rows.map(row => <article key={row.id} data-selected={editing?.id === row.id}><div><span className="operations-badge">{row.isPublished ? "TAMPIL" : "DRAFT"}</span>{row.isSponsored && <span className="operations-badge sponsored">SPONSOR</span>}</div><h3>{row.displayName}</h3><p>{row.description}</p><small>Urutan {row.sortOrder} · {row.feeInfo || "Info biaya belum diisi"}</small><button type="button" disabled={busy} onClick={() => edit(row)}>EDIT PROFIL</button></article>)}</div>}</section>
      <section className="operations-card" ref={formRef} tabIndex={-1}><p className="eyebrow">// {editing ? `EDIT PROFIL #${editing.id}` : "PROFIL BARU"}</p><h2>{editing ? "KELOLA PROFIL." : "TAMBAH REKBER."}</h2><form className="operations-form" noValidate onSubmit={prepare}><fieldset disabled={busy || Boolean(pending)}>
        <label>Nama rekber<input value={draft.displayName} maxLength={120} onChange={event => setDraft({ ...draft, displayName: event.target.value })}/></label>
        <label>Deskripsi layanan<textarea rows={4} value={draft.description} maxLength={1000} onChange={event => setDraft({ ...draft, description: event.target.value })}/></label>
        <label>Link profil resmi<input type="url" value={draft.profileUrl} maxLength={500} placeholder="https://..." onChange={event => setDraft({ ...draft, profileUrl: event.target.value })}/></label>
        <label>Link kontak resmi<input type="url" value={draft.contactUrl} maxLength={500} placeholder="https://wa.me/... atau link kontak lain" onChange={event => setDraft({ ...draft, contactUrl: event.target.value })}/></label>
        <label>Informasi biaya (opsional)<input value={draft.feeInfo} maxLength={200} placeholder="Contoh: tanyakan biaya sebelum transaksi" onChange={event => setDraft({ ...draft, feeInfo: event.target.value })}/></label>
        <label>Urutan tampil<input type="number" min={0} max={9999} value={draft.sortOrder} onChange={event => setDraft({ ...draft, sortOrder: Number(event.target.value) })}/><small>Angka lebih kecil ditampilkan lebih awal.</small></label>
        <label className="operations-checkbox"><input type="checkbox" checked={draft.isSponsored} onChange={event => setDraft({ ...draft, isSponsored: event.target.checked })}/><span>Penempatan sponsor — tampilkan label Sponsor di publik</span></label>
        <label className="operations-checkbox"><input type="checkbox" checked={draft.isPublished} onChange={event => setDraft({ ...draft, isPublished: event.target.checked })}/><span>Tampilkan profil di halaman rekber</span></label>
        <label>Alasan perubahan<textarea rows={3} value={draft.rationale} maxLength={1000} placeholder="Minimal 10 karakter" onChange={event => setDraft({ ...draft, rationale: event.target.value })}/></label>
      </fieldset>
        {pending ? <div className="operations-confirm"><strong>{pending.isPublished ? "SIMPAN & TAMPILKAN PROFIL INI?" : "SIMPAN SEBAGAI DRAFT?"}</strong><p>{pending.displayName} · {pending.isSponsored ? "Dengan label Sponsor" : "Tanpa label Sponsor"}</p><p>{pending.isPublished ? "Nama, deskripsi, dan kontak resmi akan dapat dilihat publik." : "Profil tidak akan muncul di halaman publik setelah perubahan disimpan."}</p><div><button type="button" disabled={busy} onClick={() => setPending(null)}>BATAL</button><button type="button" disabled={busy} className="tactical-button" onClick={() => void save()}>{busy ? "MENYIMPAN..." : "YA, SIMPAN PROFIL"}</button></div></div> : <button type="submit" className="tactical-button" disabled={busy}>TINJAU & SIMPAN</button>}
      </form></section>
    </div>
  </main>;
}
