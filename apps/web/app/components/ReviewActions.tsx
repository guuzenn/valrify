"use client";

import { ArrowIcon } from "./ArrowIcon";
import { useEffect, useRef, useState } from "react";
import { reviewSchema } from "@valrify/validation";
import { browserApi } from "../../lib/browser-api";

const noteTemplates = [
  ["BUKTI LENGKAP", "Bukti lengkap dan isi laporan sesuai dengan data yang dikirim."],
  ["DATA CUKUP", "Identitas akun dan bukti transaksi cukup untuk menampilkan laporan."],
  ["BUKTI KURANG", "Bukti yang dikirim belum cukup untuk mendukung laporan."],
  ["DATA TIDAK COCOK", "Data laporan tidak cocok dengan bukti yang dikirim."],
  ["LAPORAN DUPLIKAT", "Laporan ini sama dengan kasus yang sudah pernah dikirim."],
] as const;

type EvidenceOption = { id: number; fileName: string; mimeType: string; isPublicApproved: boolean };

type Decision = "PUBLISH" | "REJECT" | "WITHDRAW" | "NEEDS_INFO";

export function ReviewActions({ reportId, updatedAt, evidence, evidenceUrl, published = false, onDone, endpointBase = "/admin", ownerMode = false }: { reportId: number; updatedAt: string; evidence: EvidenceOption[]; evidenceUrl: string | null; published?: boolean; onDone: () => void; endpointBase?: string; ownerMode?: boolean }) {
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [rationale, setRationale] = useState("");
  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null);
  const [working, setWorking] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const [publicEvidenceIds, setPublicEvidenceIds] = useState<number[]>(
    evidence.filter((item) => item.isPublicApproved).map((item) => item.id),
  );

  useEffect(() => {
    if (message?.error) {
      messageRef.current?.focus({ preventScroll: true });
      messageRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [message]);

  function readDecision(decision: Decision) {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    const result = reviewSchema.safeParse({ decision, updatedAt, summary: data.get("summary") ?? "", rationale: data.get("rationale"), publicEvidenceIds });
    if (!result.success) {
      setMessage({ text: result.error.issues.map((issue) => issue.message).join(" "), error: true });
      setPendingDecision(null);
      return;
    }
    if (decision === "PUBLISH" && !evidenceUrl && !publicEvidenceIds.length) {
      setMessage({ text: "Pilih minimal satu gambar bukti untuk publik, atau tambahkan link posting bukti lewat koreksi laporan.", error: true });
      setPendingDecision(null);
      return;
    }
    return result.data;
  }

  function prepare(decision: Decision) {
    if (!readDecision(decision)) return;
    setMessage(null);
    setPendingDecision(decision);
  }

  async function act(decision: Decision) {
    const data = readDecision(decision);
    if (!data) return;
    setWorking(true);
    setMessage({ text: "Memproses...", error: false });
    try {
      await browserApi(`${endpointBase}/reports/${reportId}/review`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      setMessage({ text: decision === "PUBLISH" ? "Laporan sudah ditampilkan." : decision === "WITHDRAW" ? "Laporan ditarik dari publik." : decision === "NEEDS_INFO" ? "Permintaan tambahan tersimpan dan dapat dilihat pengirim." : "Laporan ditolak.", error: false });
      onDone();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Tindakan gagal. Silakan coba lagi.", error: true });
      setPendingDecision(null);
    } finally {
      setWorking(false);
    }
  }

  return <form ref={formRef} className="review-actions" noValidate onSubmit={(event) => event.preventDefault()}>
    {!published && <><label>Ringkasan yang akan dilihat pengguna (wajib jika laporan ditampilkan, minimal 30 karakter)<textarea name="summary" rows={4} minLength={30} maxLength={2000}/></label>
    <div className="evidence-approval"><strong>BUKTI YANG BOLEH DILIHAT PUBLIK</strong><p>Centang hanya gambar yang sudah diperiksa dan tidak membocorkan data korban atau pihak lain.</p>{evidenceUrl && <a href={evidenceUrl} target="_blank" rel="noreferrer">Link posting bukti tersedia <ArrowIcon/></a>}{evidence.filter((item) => item.mimeType.startsWith("image/")).map((item) => <label key={item.id}><input type="checkbox" checked={publicEvidenceIds.includes(item.id)} onChange={(event) => setPublicEvidenceIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))}/><span>{item.fileName}</span></label>)}{!evidenceUrl && evidence.every((item) => !item.mimeType.startsWith("image/")) && <small>Tidak ada gambar atau link yang dapat dijadikan bukti publik.</small>}</div>
    <div className="note-templates"><span>ISI CATATAN CEPAT</span><div>{noteTemplates.map(([label, value]) => <button key={label} type="button" onClick={() => setRationale(value)}>{label}</button>)}</div></div></>}
    <label>{published ? "Alasan penarikan laporan" : ownerMode ? "Catatan publikasi" : "Catatan keputusan admin"} (wajib, minimal 10 karakter)<textarea name="rationale" rows={3} required minLength={10} maxLength={2000} value={rationale} onChange={(event) => setRationale(event.target.value)}/></label>
    {message && <div ref={messageRef} tabIndex={-1} className={message.error ? "review-feedback error" : "review-feedback"} role={message.error ? "alert" : "status"}>{message.error && <strong>BELUM BISA DILANJUTKAN</strong>}<p>{message.text}</p></div>}
    {pendingDecision && <div className={`admin-decision-confirm ${pendingDecision !== "PUBLISH" ? "reject" : "publish"}`}><div><strong>{pendingDecision === "PUBLISH" ? "TAMPILKAN LAPORAN INI?" : pendingDecision === "WITHDRAW" ? "TARIK LAPORAN DARI PUBLIK?" : pendingDecision === "NEEDS_INFO" ? "MINTA INFORMASI TAMBAHAN?" : "TOLAK LAPORAN INI?"}</strong><p>{pendingDecision === "PUBLISH" ? "Ringkasan dan bukti yang dipilih akan bisa dilihat pengguna." : pendingDecision === "WITHDRAW" ? "Laporan dan bukti publik tidak dapat dibuka lagi. Data tetap tersimpan untuk audit; tindakan ini belum dapat dibatalkan lewat panel." : pendingDecision === "NEEDS_INFO" ? "Catatan ini dapat dilihat pengirim melalui akun atau tautan pelacakan privat. Tuliskan dengan jelas informasi yang diperlukan. Tidak ada email yang dikirim otomatis." : "Laporan keluar dari antrean dan alasannya tetap tersimpan dalam riwayat keputusan admin."}</p></div><div><button type="button" disabled={working} onClick={() => setPendingDecision(null)}>BATAL</button><button type="button" disabled={working} onClick={() => act(pendingDecision)}>{working ? "MEMPROSES..." : "YA, LANJUTKAN"}</button></div></div>}
    {published ? <button onClick={() => prepare("WITHDRAW")} disabled={working} className="button-secondary" type="button">TARIK LAPORAN</button> : <div>{!ownerMode && <button onClick={() => prepare("NEEDS_INFO")} disabled={working} className="button-secondary" type="button">MINTA TAMBAHAN</button>}{!ownerMode && <button onClick={() => prepare("REJECT")} disabled={working} className="button-secondary" type="button">TOLAK</button>}<button onClick={() => prepare("PUBLISH")} disabled={working} className="tactical-button" type="button">TAMPILKAN LAPORAN</button></div>}
  </form>;
}
