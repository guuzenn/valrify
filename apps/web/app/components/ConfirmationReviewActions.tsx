"use client";

import { useRef, useState } from "react";
import { browserApi } from "../../lib/browser-api";

const noteTemplates = [
  ["BUKTI LENGKAP", "Bukti dan cerita transaksi cukup untuk menerbitkan testi."],
  ["TRANSAKSI COCOK", "Transaksi selesai sesuai kesepakatan dan data yang dikirim."],
  ["BUKTI KURANG", "Bukti transaksi belum cukup untuk menerbitkan testi."],
  ["CERITA TIDAK COCOK", "Cerita transaksi tidak cocok dengan bukti yang dikirim."],
] as const;

export function ConfirmationReviewActions({
  confirmationId,
  onDone,
}: {
  confirmationId: number;
  onDone: () => void;
}) {
  const [message, setMessage] = useState("");
  const [rationale, setRationale] = useState("");
  const [pendingDecision, setPendingDecision] = useState<"APPROVE" | "REJECT" | null>(null);
  const [working, setWorking] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function prepare(decision: "APPROVE" | "REJECT") {
    const form = formRef.current;
    if (!form) return;
    if (!form.reportValidity()) {
      setMessage("Catatan keputusan minimal 10 karakter.");
      return;
    }
    setMessage("");
    setPendingDecision(decision);
  }

  async function act(decision: "APPROVE" | "REJECT") {
    const form = formRef.current;
    if (!form) return;
    setWorking(true);
    setMessage("Memproses...");
    const data = new FormData(form);
    try {
      await browserApi(`/admin/transaction-confirmations/${confirmationId}/review`, {
        method: "POST",
        body: JSON.stringify({ decision, rationale: data.get("rationale") }),
      });
      setMessage(decision === "APPROVE" ? "Testi diterbitkan." : "Testi ditolak.");
      onDone();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tindakan gagal.");
      setPendingDecision(null);
    } finally {
      setWorking(false);
    }
  }

  return <form ref={formRef} className="review-actions" onSubmit={(event) => event.preventDefault()}>
    <div className="note-templates"><span>ISI CATATAN CEPAT</span><div>{noteTemplates.map(([label, value]) => <button key={label} type="button" onClick={() => setRationale(value)}>{label}</button>)}</div></div>
    <label>Catatan keputusan admin<textarea name="rationale" rows={3} required minLength={10} value={rationale} onChange={(event) => setRationale(event.target.value)}/></label>
    {pendingDecision && <div className={`admin-decision-confirm ${pendingDecision === "REJECT" ? "reject" : "publish"}`}><div><strong>{pendingDecision === "APPROVE" ? "TERBITKAN TESTI INI?" : "TOLAK TESTI INI?"}</strong><p>Keputusan dan catatan admin akan disimpan.</p></div><div><button type="button" disabled={working} onClick={() => setPendingDecision(null)}>BATAL</button><button type="button" disabled={working} onClick={() => act(pendingDecision)}>{working ? "MEMPROSES..." : "YA, LANJUTKAN"}</button></div></div>}
    <div><button onClick={() => prepare("REJECT")} disabled={working} className="button-secondary" type="button">TOLAK</button><button onClick={() => prepare("APPROVE")} disabled={working} className="tactical-button" type="button">TERBITKAN TESTI</button></div>
    {message && <p className="field-note" role="status">{message}</p>}
  </form>;
}
