"use client";

import { useState } from "react";
import { browserApi } from "../../lib/browser-api";

export function ConfirmationReviewActions({
  confirmationId,
  onDone,
}: {
  confirmationId: number;
  onDone: () => void;
}) {
  const [message, setMessage] = useState("");

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

  return <form className="review-actions" onSubmit={(event)=>event.preventDefault()}>
    <label>Catatan keputusan admin<textarea name="rationale" rows={3} required minLength={10}/></label>
    <div><button onClick={(event)=>act("REJECT",event.currentTarget.form!)} className="button-secondary" type="button">TOLAK</button><button onClick={(event)=>act("APPROVE",event.currentTarget.form!)} className="tactical-button" type="button">TERBITKAN TESTI</button></div>
    {message&&<p className="field-note" role="status">{message}</p>}
  </form>;
}
