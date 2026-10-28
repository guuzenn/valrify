"use client";

import { useState, type ReactNode } from "react";
import { identifierTypes, labelIdentifierType, labelReportCategory, labelReportPartyRole, reportCategories, reportPartyRoles } from "@valrify/domain";
import { reportEditSchema, type ReportEditInput } from "@valrify/validation";
import { browserApi } from "../../lib/browser-api";
import { IndonesianBanks, IndonesianEwallets, SearchableProvider } from "./SubmitReportForm";

export type EditableReport = { id: number; updatedAt: string; chronology: string; transactionType: string; transactionDate: string | null; evidenceUrl: string | null; parties: ReportEditInput["parties"] };
type Draft = Omit<ReportEditInput, "updatedAt" | "rationale">;

export function ReportEditor({ report, onSaved, children }: { report: EditableReport; onSaved: () => Promise<void>; children: ReactNode }) {
  const initial: Draft = { chronology: report.chronology, category: reportCategories.includes(report.transactionType as Draft["category"]) ? report.transactionType as Draft["category"] : "OTHER", transactionDate: report.transactionDate?.slice(0, 10) ?? "", evidenceUrl: report.evidenceUrl ?? "", parties: report.parties };
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rationale, setRationale] = useState("");
  const [message, setMessage] = useState("");
  const identifierCount = draft.parties.reduce((sum, party) => sum + party.identifiers.length, 0);

  function updateParty(index: number, patch: Partial<Draft["parties"][number]>) {
    setDraft(current => ({ ...current, parties: current.parties.map((party, i) => i === index ? { ...party, ...patch } : party) }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const parsed = reportEditSchema.safeParse({ ...draft, updatedAt: report.updatedAt, rationale });
    if (!parsed.success) { setMessage(parsed.error.issues.map(issue => issue.message).join(" ")); return; }
    setSaving(true); setMessage("");
    try {
      await browserApi(`/admin/reports/${report.id}`, { method: "PATCH", body: JSON.stringify(parsed.data) });
      await onSaved();
      setEditing(false); setMessage("Data laporan berhasil disimpan. Periksa kembali sebelum publikasi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Data laporan gagal disimpan."); }
    finally { setSaving(false); }
  }

  return <section className="report-editor">
    <div className="report-editor-heading"><div><strong>DATA LAPORAN</strong><p>Koreksi sesuai bukti sebelum ditampilkan. Setiap perubahan disimpan dalam riwayat admin.</p></div>{!editing && <button type="button" onClick={() => { setDraft(initial); setEditing(true); setMessage(""); }}>UBAH DATA LAPORAN</button>}</div>
    {editing && <form onSubmit={event => void save(event)} noValidate>
      <fieldset disabled={saving}>
        <div className="report-editor-grid"><label>Kategori<select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value as Draft["category"] })}>{reportCategories.map(category => <option key={category} value={category}>{labelReportCategory(category)}</option>)}</select></label><label>Tanggal kejadian<input type="date" value={draft.transactionDate} onChange={event => setDraft({ ...draft, transactionDate: event.target.value })}/></label></div>
        <label>Kronologi lengkap (privat)<textarea rows={8} value={draft.chronology} maxLength={5000} onChange={event => setDraft({ ...draft, chronology: event.target.value })}/></label>
        <label>Link posting bukti<input type="url" value={draft.evidenceUrl} maxLength={500} placeholder="https://..." onChange={event => setDraft({ ...draft, evidenceUrl: event.target.value })}/></label>
        <p className="report-editor-notice">Pisahkan akun pengarah dan rekber yang berbeda. Untuk penyamaran, isi akun peniru yang berinteraksi sesuai bukti. Hanya masukkan pihak yang dilaporkan; data korban tetap di luar profil publik. Pihak pertama menjadi profil utama laporan.</p>
        {draft.parties.map((party, index) => <section className="report-editor-party" key={index}>
          <header><strong>PIHAK {index + 1}{index === 0 ? " / UTAMA" : ""}</strong><div>{index > 0 && <button type="button" onClick={() => setDraft({ ...draft, parties: [party, ...draft.parties.filter((_, i) => i !== index)] })}>JADIKAN UTAMA</button>}{draft.parties.length > 1 && <button type="button" onClick={() => setDraft({ ...draft, parties: draft.parties.filter((_, i) => i !== index) })}>HAPUS PIHAK {index + 1}</button>}</div></header>
          <div className="report-editor-grid"><label>Nama akun / pihak terlapor<input value={party.entityName} maxLength={80} onChange={event => updateParty(index, { entityName: event.target.value })}/></label><label>Peran dalam kasus<select value={party.role} onChange={event => updateParty(index, { role: event.target.value as typeof party.role })}>{reportPartyRoles.map(role => <option value={role} key={role}>{labelReportPartyRole(role)}</option>)}</select></label></div>
          {party.identifiers.map((identifier, identifierIndex) => {
            const update = (patch: Partial<typeof identifier>) => updateParty(index, { identifiers: party.identifiers.map((item, i) => i === identifierIndex ? { ...item, ...patch } : item) });
            return <div className="report-editor-identifier" key={identifierIndex}>
              <label>Jenis data<select value={identifier.type} onChange={event => update({ type: event.target.value as typeof identifier.type, provider: "" })}>{identifierTypes.map(type => <option value={type} key={type}>{labelIdentifierType(type)}</option>)}</select></label>
              <label>{labelIdentifierType(identifier.type)}<input value={identifier.value} maxLength={160} onChange={event => update({ value: event.target.value })}/></label>
              {["BANK_ACCOUNT", "EWALLET"].includes(identifier.type) && <label>Bank / e-wallet<SearchableProvider id={`edit-${report.id}-${index}-${identifierIndex}`} value={identifier.provider ?? ""} onChange={value => update({ provider: value })} options={identifier.type.startsWith("BANK") ? IndonesianBanks : IndonesianEwallets} placeholder="Pilih atau ketik provider"/></label>}
              <button type="button" disabled={party.identifiers.length === 1} onClick={() => updateParty(index, { identifiers: party.identifiers.filter((_, i) => i !== identifierIndex) })} aria-label={`Hapus data ${identifierIndex + 1} pihak ${index + 1}`}>HAPUS DATA</button>
            </div>;
          })}
          <button type="button" disabled={identifierCount >= 8} onClick={() => updateParty(index, { identifiers: [...party.identifiers, { type: "FACEBOOK_NAME", value: "", provider: "" }] })}>TAMBAH NOMOR / AKUN</button>
        </section>)}
        <button type="button" disabled={draft.parties.length >= 4 || identifierCount >= 8} onClick={() => setDraft({ ...draft, parties: [...draft.parties, { entityName: "", role: "REPORTED", identifiers: [{ type: "FACEBOOK_NAME", value: "", provider: "" }] }] })}>TAMBAH PIHAK TERPISAH</button>
        <p className="field-note">{identifierCount}/8 nomor atau akun untuk seluruh pihak. Nama serupa tidak otomatis menyatukan profil.</p>
        <label>Alasan koreksi (minimal 10 karakter)<textarea rows={3} maxLength={2000} value={rationale} onChange={event => setRationale(event.target.value)}/></label>
        <div className="report-editor-buttons"><button type="button" onClick={() => { setDraft(initial); setEditing(false); setMessage(""); }}>BATAL</button><button className="tactical-button" type="submit">{saving ? "MENYIMPAN..." : "SIMPAN KOREKSI"}</button></div>
      </fieldset>
    </form>}
    {message && <p className="report-editor-message" role="status">{message}</p>}
    {editing && <p className="report-editor-notice">Simpan atau batalkan koreksi sebelum mengambil keputusan moderasi.</p>}
    <fieldset className="report-editor-review" disabled={editing || saving}>{children}</fieldset>
  </section>;
}
