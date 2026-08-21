"use client";

import { useState } from "react";
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

  async function act(decision: "APPROVE" | "REJECT", form: HTMLFormElement) {
    if (!form.reportValidity()) {
      setMessage("Catatan keputusan minimal 10 karakter.");
      return;
    }
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
    }
  }

  return <form className="review-actions" onSubmit={(event) => event.preventDefault()}>
    <div className="note-templates"><span>ISI CATATAN CEPAT</span><div>{noteTemplates.map(([label, value]) => <button key={label} type="button" onClick={() => setRationale(value)}>{label}</button>)}</div></div>
    <label>Catatan keputusan admin<textarea name="rationale" rows={3} required minLength={10} value={rationale} onChange={(event) => setRationale(event.target.value)}/></label>
    <div><button onClick={(event) => act("REJECT", event.currentTarget.form!)} className="button-secondary" type="button">TOLAK</button><button onClick={(event) => act("APPROVE", event.currentTarget.form!)} className="tactical-button" type="button">TERBITKAN TESTI</button></div>
    {message && <p className="field-note" role="status">{message}</p>}
  </form>;
}
