"use client";

import { useState } from "react";
import { browserApi } from "../../lib/browser-api";

export function CommunityModerationActions({ targetId, kind, onDone }: { targetId: number; kind: "post" | "comment"; onDone: () => void }) {
  const [decision, setDecision] = useState<"DISMISS" | "REMOVE">("DISMISS");
  const [rationale, setRationale] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      await browserApi(`/admin/community-${kind === "post" ? "posts" : "comments"}/${targetId}/review`, { method: "POST", body: JSON.stringify({ decision, rationale }) });
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Keputusan belum bisa disimpan.");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  return <div className="community-moderation-actions">
    <div className="community-moderation-choice"><button type="button" className={decision === "DISMISS" ? "active" : ""} onClick={() => { setDecision("DISMISS"); setConfirming(false); }}>BIARKAN {kind === "post" ? "POST" : "KOMENTAR"}</button><button type="button" className={decision === "REMOVE" ? "active remove" : ""} onClick={() => { setDecision("REMOVE"); setConfirming(false); }}>HAPUS {kind === "post" ? "POST" : "KOMENTAR"}</button></div>
    <label><span>ALASAN KEPUTUSAN</span><textarea rows={3} minLength={10} maxLength={500} value={rationale} onChange={(event) => { setRationale(event.target.value); setConfirming(false); }} placeholder={decision === "REMOVE" ? `Jelaskan pelanggaran yang membuat ${kind === "post" ? "post" : "komentar"} harus dihapus.` : "Jelaskan kenapa laporan tidak memerlukan penghapusan."}/><small>{rationale.length}/500 karakter · tersimpan di audit log</small></label>
    {error && <p>{error}</p>}
    {!confirming ? <button className="community-moderation-submit" type="button" disabled={rationale.trim().length < 10} onClick={() => setConfirming(true)}>LANJUTKAN KE KONFIRMASI</button> : <div className={`community-moderation-confirm ${decision === "REMOVE" ? "remove" : ""}`}><div><strong>{decision === "REMOVE" ? `HAPUS ${kind === "post" ? "POST" : "KOMENTAR"} DARI PUBLIK?` : `TUTUP LAPORAN DAN BIARKAN ${kind === "post" ? "POST" : "KOMENTAR"}?`}</strong><p>Keputusan akan menyelesaikan semua laporan aktif untuk konten ini.</p></div><div><button type="button" onClick={() => setConfirming(false)}>BATAL</button><button type="button" disabled={loading} onClick={() => void submit()}>{loading ? "MENYIMPAN..." : "YA, SIMPAN"}</button></div></div>}
  </div>;
}
