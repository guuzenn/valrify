"use client";

import { useEffect, useState } from "react";
import { browserApiUrl } from "../../lib/browser-api";

type AdminEvidence = {
  id: number;
  fileName: string;
  mimeType: string;
  size: number;
  caption?: string;
  evidenceType?: string;
};

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AdminEvidenceViewer({ evidence, kind = "report" }: { evidence: AdminEvidence[]; kind?: "report" | "confirmation" }) {
  const [selected, setSelected] = useState<AdminEvidence | null>(null);
  const basePath = kind === "report" ? "/admin/evidence" : "/admin/transaction-confirmation-evidence";

  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [selected]);

  if (evidence.length === 0) return <p className="admin-evidence-empty">Tidak ada file bukti yang diunggah.</p>;

  return <>
    <div className="admin-evidence-grid">
      {evidence.map((item) => {
        const href = `${browserApiUrl}${basePath}/${item.id}`;
        const isImage = item.mimeType.startsWith("image/");
        return isImage ? <button type="button" key={item.id} onClick={() => setSelected(item)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={href} alt={`Bukti ${item.fileName}`} />
          <span><strong>{item.fileName}</strong><small>{fileSize(item.size)} · BUKA PREVIEW</small></span>
        </button> : <a key={item.id} href={href} target="_blank" rel="noreferrer">
          <span className="admin-file-icon">FILE</span>
          <span><strong>{item.fileName}</strong><small>{fileSize(item.size)} · BUKA FILE ↗</small></span>
        </a>;
      })}
    </div>
    {selected && <div className="admin-evidence-modal" role="dialog" aria-modal="true" aria-label={`Pratinjau ${selected.fileName}`} onClick={() => setSelected(null)}>
      <div className="admin-evidence-modal-card" onClick={(event) => event.stopPropagation()}>
        <div><span>// BUKTI UNTUK ADMIN</span><strong>{selected.fileName}</strong><button type="button" aria-label="Tutup pratinjau" onClick={() => setSelected(null)}>×</button></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${browserApiUrl}${basePath}/${selected.id}`} alt={`Bukti ${selected.fileName}`} />
        <small>Hanya untuk pemeriksaan admin. Jangan bagikan sebelum memastikan tidak ada data pribadi di dalamnya.</small>
      </div>
    </div>}
  </>;
}
