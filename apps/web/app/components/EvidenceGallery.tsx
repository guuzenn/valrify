"use client";

import { ArrowIcon } from "./ArrowIcon";
import { TaskDialog } from "./TaskDialog";
import { useState } from "react";
import { browserApiUrl } from "../../lib/browser-api";

type PublicEvidence = { id: number; mimeType: string; caption: string };

export function EvidenceGallery({
  publicId,
  evidence,
  evidenceUrl,
}: {
  publicId: string;
  evidence: PublicEvidence[];
  evidenceUrl: string | null;
}) {
  const [selected, setSelected] = useState<PublicEvidence | null>(null);



  if (evidence.length === 0 && !evidenceUrl) return null;

  const evidenceSrc = (id: number) =>
    `${browserApiUrl}/reports/public/${encodeURIComponent(publicId)}/evidence/${id}`;

  return <section className="evidence-actions" aria-label="Bukti laporan scam">
    <h2>Bukti laporan</h2><p className="evidence-help">Buka bukti yang dibagikan untuk mencocokkan cerita dan akun terkait.</p>
    <div>
      {evidence.length > 0 && <button className="tactical-button" type="button" onClick={() => setSelected(evidence[0]!)}>Lihat bukti gambar ({evidence.length})</button>}
      {evidenceUrl && <a className={evidence.length ? "button-secondary" : "tactical-button"} href={evidenceUrl} target="_blank" rel="noreferrer">Buka posting bukti <ArrowIcon/></a>}
    </div>
    {selected && <TaskDialog open onClose={() => setSelected(null)} title="Bukti yang dibagikan">
      <div className="evidence-modal-card">
        <div className="evidence-modal-head"><div><span>BUKTI YANG DIBAGIKAN</span><strong>{selected.caption || "Bukti pendukung laporan"}</strong></div><button type="button" onClick={() => setSelected(null)} aria-label="Tutup bukti">×</button></div>
        <img src={evidenceSrc(selected.id)} alt={selected.caption || "Bukti pendukung laporan scam"}/>
        {evidence.length > 1 && <div className="evidence-thumbnails">{evidence.map((item, index) => <button type="button" className={selected.id === item.id ? "active" : ""} key={item.id} onClick={() => setSelected(item)}>BUKTI {index + 1}</button>)}</div>}
      </div>
    </TaskDialog>}
  </section>;
}
