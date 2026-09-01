"use client";

import { FormEvent, useEffect, useState } from "react";
import { browserApi } from "../../lib/browser-api";

export function CommunityReportDialog({ kind, targetId, body, onClose, onReported }: { kind: "post" | "comment"; targetId: number; body: string; onClose: () => void; onReported: () => void }) {
  const [reason, setReason] = useState("SPAM");
  const [detail, setDetail] = useState("");
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", close); };
  }, [onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReporting(true);
    setError("");
    try {
      const path = kind === "post" ? `/community/posts/${targetId}/report` : `/community/comments/${targetId}/report`;
      await browserApi(path, { method: "POST", body: JSON.stringify({ reason, detail }) });
      onReported();
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : `${kind === "post" ? "Post" : "Komentar"} belum bisa dilaporkan.`);
    } finally {
      setReporting(false);
    }
  }

  return <div className="community-report-modal" role="dialog" aria-modal="true" aria-labelledby="community-report-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form onSubmit={(event) => void submit(event)}><div className="community-report-head"><div><span>// LAPORKAN {kind === "post" ? "POST" : "KOMENTAR"}</span><h2 id="community-report-title">LAPORKAN {kind === "post" ? "POST" : "KOMENTAR"}.</h2></div><button type="button" aria-label="Tutup" onClick={onClose}>×</button></div><blockquote>{body}</blockquote><label><span>ALASAN</span><select value={reason} onChange={(event) => setReason(event.target.value)}><option value="SPAM">Spam atau promosi berulang</option><option value="HARASSMENT">Pelecehan atau serangan pribadi</option><option value="PERSONAL_DATA">Membagikan data pribadi</option><option value="SCAM_ACCUSATION">Tuduhan scam tanpa jalur laporan</option><option value="OTHER">Masalah lainnya</option></select></label><label><span>JELASKAN MASALAHNYA</span><textarea required minLength={10} maxLength={500} rows={4} value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Bantu admin memahami bagian yang bermasalah."/><small>{detail.length}/500 karakter</small></label>{error && <p className="community-report-error">{error}</p>}<p>Hanya admin yang dapat melihat siapa yang mengirim laporan ini.</p><div className="community-report-actions"><button type="button" onClick={onClose}>BATAL</button><button type="submit" disabled={reporting || detail.trim().length < 10}>{reporting ? "MENGIRIM..." : "KIRIM LAPORAN →"}</button></div></form></div>;
}
