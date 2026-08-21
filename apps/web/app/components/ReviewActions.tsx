"use client";

import { useState } from "react";
import { browserApi } from "../../lib/browser-api";

const noteTemplates = [
  ["BUKTI LENGKAP", "Bukti lengkap dan isi laporan sesuai dengan data yang dikirim."],
  ["DATA CUKUP", "Identitas akun dan bukti transaksi cukup untuk menerbitkan laporan."],
  ["BUKTI KURANG", "Bukti yang dikirim belum cukup untuk mendukung laporan."],
  ["DATA TIDAK COCOK", "Data laporan tidak cocok dengan bukti yang dikirim."],
  ["LAPORAN DUPLIKAT", "Laporan ini sama dengan kasus yang sudah pernah dikirim."],
] as const;

export function ReviewActions({ reportId, onDone }: { reportId: number; onDone: () => void }) {
  const [message, setMessage] = useState("");
  const [rationale, setRationale] = useState("");

  async function act(decision: "PUBLISH" | "REJECT", form: HTMLFormElement) {
    if (!form.reportValidity()) {
      setMessage("Isi catatan keputusan sesuai batas minimum.");
      return;
    }
    const data = new FormData(form);
    const summary = String(data.get("summary") ?? "").trim();
    if (decision === "PUBLISH" && summary.length < 30) {
      setMessage("Ringkasan yang akan tampil minimal 30 karakter.");
      return;
    }
    setMessage("Memproses...");
    try {
      await browserApi(`/admin/reports/${reportId}/review`, {
        method: "POST",
        body: JSON.stringify({
          decision,
          summary,
          rationale: data.get("rationale"),
        }),
      });
      setMessage(decision === "PUBLISH" ? "Laporan diterbitkan." : "Laporan ditolak.");
      onDone();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tindakan gagal.");
    }
  }

  return <form className="review-actions" onSubmit={(event) => event.preventDefault()}>
    <label>Ringkasan yang akan tampil (wajib kalau diterbitkan)<textarea name="summary" rows={4} minLength={30}/></label>
    <div className="note-templates"><span>ISI CATATAN CEPAT</span><div>{noteTemplates.map(([label, value]) => <button key={label} type="button" onClick={() => setRationale(value)}>{label}</button>)}</div></div>
    <label>Catatan keputusan admin<textarea name="rationale" rows={3} required minLength={10} value={rationale} onChange={(event) => setRationale(event.target.value)}/></label>
    <div><button onClick={(event) => act("REJECT", event.currentTarget.form!)} className="button-secondary" type="button">TOLAK</button><button onClick={(event) => act("PUBLISH", event.currentTarget.form!)} className="tactical-button" type="button">TERBITKAN LAPORAN</button></div>
    {message && <p className="field-note" role="status">{message}</p>}
  </form>;
}
