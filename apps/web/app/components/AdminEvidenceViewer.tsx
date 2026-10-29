"use client";

import { ArrowIcon } from "./ArrowIcon";
import { TaskDialog } from "./TaskDialog";
import { useState } from "react";
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

export function AdminEvidenceViewer({ evidence, kind = "report", basePath = kind === "report" ? "/admin/evidence" : "/admin/transaction-confirmation-evidence" }: { evidence: AdminEvidence[]; kind?: "report" | "confirmation"; basePath?: string }) {
  const [selected, setSelected] = useState<AdminEvidence | null>(null);



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
          <span><strong>{item.fileName}</strong><small>{fileSize(item.size)} · BUKA FILE <ArrowIcon/></small></span>
        </a>;
      })}
    </div>
    {selected && <TaskDialog open onClose={() => setSelected(null)} title="Bukti privat">
      <div className="admin-evidence-modal-card" onClick={(event) => event.stopPropagation()}>
        <div><span className="section-label">// BUKTI PRIVAT</span><strong>{selected.fileName}</strong><button type="button" aria-label="Tutup pratinjau" onClick={() => setSelected(null)}>×</button></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${browserApiUrl}${basePath}/${selected.id}`} alt={`Bukti ${selected.fileName}`} />
        <small>Jangan bagikan sebelum memastikan tidak ada data pribadi di dalamnya.</small>
      </div>
    </TaskDialog>}
  </>;
}
