"use client";

import { TaskDialog } from "./TaskDialog";
import { useState } from "react";
import { identifierJsonExamples, parseReportJson, reportJsonTemplate } from "../../lib/report-json";

export function ReportJsonImport({ onImport, disabled }: {
  onImport: (data: ReturnType<typeof parseReportJson>) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function copyTemplate(value = reportJsonTemplate, message = "Template disalin. Ganti data contoh dengan data laporanmu.") {
    try {
      await navigator.clipboard.writeText(value);
      setError(""); setMessage(message);
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
    {!open && message && <p className="report-json-success" role="status">{message}</p>}
    <TaskDialog open={open} dismissOnBackdrop={false} onClose={() => setOpen(false)} title="Isi form dari JSON">
    <div className="report-json-body">
      <p className="field-note">Salin atau download template, ganti data contoh, lalu paste JSON di bawah. Impor mengganti isian teks dan nomor/akun pada form. File bukti yang sudah dipilih tetap tersimpan. Periksa form sebelum mengirim.</p>
      <details>
        <summary>PREVIEW TEMPLATE & PETUNJUK</summary>
        <label>Template JSON<textarea aria-label="Template JSON" readOnly value={reportJsonTemplate} rows={12} spellCheck={false}/></label>
        <p className="field-note">category: PAYMENT_FRAUD, FAKE_MIDDLEMAN, HACKBACK, ACCOUNT_MISMATCH, OTHER. Untuk category OTHER, isi otherCategory dengan masalah singkat (5–100 karakter). Tanggal: YYYY-MM-DD atau kosong. Link bukti boleh kosong jika kamu mengunggah file.</p>
        <p className="field-note">type: BANK_ACCOUNT, EWALLET, PHONE, RIOT_ID, DISCORD, FACEBOOK_NAME, PERSON_NAME, OTHER. provider wajib untuk rekening/e-wallet. relatedName untuk nama pemilik rekening/e-wallet; secondaryValue untuk nickname Riot atau link Facebook. Maksimal 8 data termasuk nama/link tambahan. JSON tidak memuat file bukti.</p>
      </details>
      <div className="report-json-actions">
        <button type="button" className="add-data-button" onClick={() => void copyTemplate()}>SALIN TEMPLATE</button>
        <button type="button" className="add-data-button" onClick={downloadTemplate}>DOWNLOAD JSON</button>
      </div>
      <details className="identifier-json-reference">
        <summary>Contoh semua jenis nomor / akun (8 jenis)</summary>
        <p>Pilih contoh yang kamu perlukan, lalu masukkan objeknya ke array <code>identifiers</code> dalam template. Jangan tempel seluruh referensi sebagai laporan.</p>
        <p>Maksimal 8 data setelah diuraikan. Nama pemilik rekening/e-wallet, nickname Riot, dan link Facebook masing-masing dihitung sebagai data tambahan bila diisi.</p>
        {identifierJsonExamples.map(example => <article key={example.value.type}><h3>{example.label}</h3><p>{example.note}</p><pre><code>{JSON.stringify(example.value, null, 2)}</code></pre><button type="button" className="add-data-button" onClick={() => void copyTemplate(JSON.stringify(example.value, null, 2), `Contoh ${example.label} disalin. Tambahkan ke identifiers dalam template.`)}>Salin contoh {example.label}</button></article>)}
      </details>
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
