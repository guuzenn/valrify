"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selected]);

  if (evidence.length === 0 && !evidenceUrl) return null;

  const evidenceSrc = (id: number) =>
    `${browserApiUrl}/reports/public/${encodeURIComponent(publicId)}/evidence/${id}`;

  return <section className="evidence-actions" aria-label="Bukti laporan scam">
    <p className="panel-index">BUKTI YANG SUDAH DISETUJUI ADMIN</p>
    <div>
      {evidence.length > 0 && <button className="tactical-button" type="button" onClick={() => setSelected(evidence[0]!)}>LIHAT BUKTI GAMBAR ({evidence.length})</button>}
      {evidenceUrl && <a className="button-secondary" href={evidenceUrl} target="_blank" rel="noreferrer">BUKA POST BUKTI ↗</a>}
    </div>
    {selected && <div className="evidence-modal" role="dialog" aria-modal="true" aria-label="Bukti gambar" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
      <div className="evidence-modal-card">
        <div className="evidence-modal-head"><div><span>BUKTI YANG DIBAGIKAN</span><strong>{selected.caption || "Gambar yang sudah diperiksa admin"}</strong></div><button type="button" onClick={() => setSelected(null)} aria-label="Tutup bukti">×</button></div>
        <img src={evidenceSrc(selected.id)} alt={selected.caption || "Bukti pendukung laporan scam"}/>
        {evidence.length > 1 && <div className="evidence-thumbnails">{evidence.map((item, index) => <button type="button" className={selected.id === item.id ? "active" : ""} key={item.id} onClick={() => setSelected(item)}>BUKTI {index + 1}</button>)}</div>}
      </div>
    </div>}
  </section>;
}
