"use client";

import { TaskDialog } from "./TaskDialog";
import { useState } from "react";
import { parseReportJson, reportJsonTemplate } from "../../lib/report-json";

export function ReportJsonImport({ onImport, disabled }: {
  onImport: (data: ReturnType<typeof parseReportJson>) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(reportJsonTemplate);
      setError(""); setMessage("Template disalin. Ganti data contoh dengan data laporanmu.");
    } catch {
      setError("Template belum tersalin. Pilih teks pada preview, lalu salin secara manual.");
    }
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([reportJsonTemplate], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "template-laporan-valrify.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="report-json-import">
    <button type="button" className="button-secondary" disabled={disabled} onClick={() => setOpen(true)}>Isi dari JSON</button>
    {!open && message && <p role="status">{message}</p>}
    <TaskDialog open={open} onClose={() => setOpen(false)} title="Isi form dari JSON">
    <div className="report-json-body">
      <p className="field-note">Salin atau download template, ganti data contoh, lalu paste JSON di bawah. Impor mengganti isian teks dan nomor/akun pada form. File bukti yang sudah dipilih tetap tersimpan. Periksa form sebelum mengirim.</p>
      <details>
        <summary>PREVIEW TEMPLATE & PETUNJUK</summary>
        <label>Template JSON<textarea aria-label="Template JSON" readOnly value={reportJsonTemplate} rows={12} spellCheck={false}/></label>
        <p className="field-note">category: PAYMENT_FRAUD, FAKE_MIDDLEMAN, HACKBACK, ACCOUNT_MISMATCH, OTHER. Tanggal: YYYY-MM-DD atau kosong. Link bukti boleh kosong jika kamu mengunggah file.</p>
        <p className="field-note">type: BANK_ACCOUNT, EWALLET, PHONE, RIOT_ID, DISCORD, FACEBOOK_NAME, PERSON_NAME, OTHER. provider wajib untuk rekening/e-wallet. relatedName untuk nama pemilik rekening/e-wallet; secondaryValue untuk nickname Riot atau link Facebook. Maksimal 8 data termasuk nama/link tambahan. JSON tidak memuat file bukti.</p>
      </details>
      <div className="report-json-actions">
        <button type="button" className="add-data-button" onClick={copyTemplate}>SALIN TEMPLATE</button>
        <button type="button" className="add-data-button" onClick={downloadTemplate}>DOWNLOAD JSON</button>
      </div>
      <label>Paste JSON laporan<textarea aria-label="Paste JSON laporan" value={text} onChange={event => { setText(event.target.value); setError(""); setMessage(""); }} rows={9} maxLength={30001} spellCheck={false} placeholder="Tempel JSON yang sudah kamu isi di sini."/></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="field-note" role="status">{message}</p>
      <button type="button" className="tactical-button" disabled={disabled || !text.trim()} onClick={() => {
        try {
          const data = parseReportJson(text);
          onImport(data);
          setOpen(false);
          setTimeout(() => document.querySelector<HTMLInputElement>('[name="entityName"]')?.focus(), 0);
          setError(""); setMessage("Form berhasil diisi dari JSON. Periksa data dan lengkapi bukti sebelum mengirim.");
        } catch (cause) { setMessage(""); setError(cause instanceof Error ? cause.message : "JSON gagal dibaca."); }
      }}>TERAPKAN JSON KE FORM</button>
    </div>
    </TaskDialog>
  </div>;
}
