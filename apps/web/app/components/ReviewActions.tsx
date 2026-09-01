"use client";

import { useRef, useState } from "react";
import { browserApi } from "../../lib/browser-api";

const noteTemplates = [
  ["BUKTI LENGKAP", "Bukti lengkap dan isi laporan sesuai dengan data yang dikirim."],
  ["DATA CUKUP", "Identitas akun dan bukti transaksi cukup untuk menampilkan laporan."],
  ["BUKTI KURANG", "Bukti yang dikirim belum cukup untuk mendukung laporan."],
  ["DATA TIDAK COCOK", "Data laporan tidak cocok dengan bukti yang dikirim."],
  ["LAPORAN DUPLIKAT", "Laporan ini sama dengan kasus yang sudah pernah dikirim."],
] as const;

type EvidenceOption = { id: number; fileName: string; mimeType: string; isPublicApproved: boolean };

export function ReviewActions({ reportId, evidence, evidenceUrl, onDone }: { reportId: number; evidence: EvidenceOption[]; evidenceUrl: string | null; onDone: () => void }) {
  const [message, setMessage] = useState("");
  const [rationale, setRationale] = useState("");
  const [pendingDecision, setPendingDecision] = useState<"PUBLISH" | "REJECT" | null>(null);
  const [working, setWorking] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [publicEvidenceIds, setPublicEvidenceIds] = useState<number[]>(
    evidence.filter((item) => item.isPublicApproved).map((item) => item.id),
  );

  function prepare(decision: "PUBLISH" | "REJECT") {
    const form = formRef.current;
    if (!form) return;
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
    setMessage("");
    setPendingDecision(decision);
  }

  async function act(decision: "PUBLISH" | "REJECT") {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    const summary = String(data.get("summary") ?? "").trim();
    setWorking(true);
    setMessage("Memproses...");
    try {
      await browserApi(`/admin/reports/${reportId}/review`, {
        method: "POST",
        body: JSON.stringify({
          decision,
          summary,
          rationale: data.get("rationale"),
          publicEvidenceIds,
        }),
      });
      setMessage(decision === "PUBLISH" ? "Laporan sudah ditampilkan." : "Laporan ditolak.");
      onDone();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tindakan gagal.");
      setPendingDecision(null);
    } finally {
      setWorking(false);
    }
  }

  return <form ref={formRef} className="review-actions" onSubmit={(event) => event.preventDefault()}>
    <label>Ringkasan yang akan dilihat pengguna (wajib jika laporan ditampilkan)<textarea name="summary" rows={4} minLength={30}/></label>
    <div className="evidence-approval"><strong>BUKTI YANG BOLEH DILIHAT PUBLIK</strong><p>Centang hanya gambar yang sudah diperiksa dan tidak membocorkan data korban atau pihak lain.</p>{evidenceUrl && <a href={evidenceUrl} target="_blank" rel="noreferrer">Link posting bukti tersedia ↗</a>}{evidence.filter((item) => item.mimeType.startsWith("image/")).map((item) => <label key={item.id}><input type="checkbox" checked={publicEvidenceIds.includes(item.id)} onChange={(event) => setPublicEvidenceIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))}/><span>{item.fileName}</span></label>)}{!evidenceUrl && evidence.every((item) => !item.mimeType.startsWith("image/")) && <small>Tidak ada gambar atau link yang dapat dijadikan bukti publik.</small>}</div>
    <div className="note-templates"><span>ISI CATATAN CEPAT</span><div>{noteTemplates.map(([label, value]) => <button key={label} type="button" onClick={() => setRationale(value)}>{label}</button>)}</div></div>
    <label>Catatan keputusan admin<textarea name="rationale" rows={3} required minLength={10} value={rationale} onChange={(event) => setRationale(event.target.value)}/></label>
    {pendingDecision && <div className={`admin-decision-confirm ${pendingDecision === "REJECT" ? "reject" : "publish"}`}><div><strong>{pendingDecision === "PUBLISH" ? "TAMPILKAN LAPORAN INI?" : "TOLAK LAPORAN INI?"}</strong><p>{pendingDecision === "PUBLISH" ? "Ringkasan dan bukti yang dipilih akan bisa dilihat pengguna." : "Laporan keluar dari antrean dan alasannya tetap tersimpan dalam riwayat keputusan admin."}</p></div><div><button type="button" disabled={working} onClick={() => setPendingDecision(null)}>BATAL</button><button type="button" disabled={working} onClick={() => act(pendingDecision)}>{working ? "MEMPROSES..." : "YA, LANJUTKAN"}</button></div></div>}
    <div><button onClick={() => prepare("REJECT")} disabled={working} className="button-secondary" type="button">TOLAK</button><button onClick={() => prepare("PUBLISH")} disabled={working} className="tactical-button" type="button">TAMPILKAN LAPORAN</button></div>
    {message && <p className="field-note" role="status">{message}</p>}
  </form>;
}
