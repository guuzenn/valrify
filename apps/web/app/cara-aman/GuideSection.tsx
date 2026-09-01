"use client";

import { useEffect, useRef } from "react";

export function GuideSection({ id, number, label, title, description, children, priority = false, optional = false }: { id: string; number: string; label: string; title: string; description: string; children: React.ReactNode; priority?: boolean; optional?: boolean }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const badge = priority ? "WAJIB" : optional ? "OPSIONAL" : null;

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 650px)");
    const syncLayout = () => {
      if (detailsRef.current) detailsRef.current.open = !mobileQuery.matches;
    };

    syncLayout();
    mobileQuery.addEventListener("change", syncLayout);
    return () => mobileQuery.removeEventListener("change", syncLayout);
  }, []);

  return <details ref={detailsRef} open className={`safety-section safety-accordion${priority ? " priority" : ""}${optional ? " optional" : ""}`} id={id}>
    <summary className="safety-accordion-summary"><span>{number}</span><strong>{label}</strong>{badge && <em>{badge}</em>}<i aria-hidden="true">+</i></summary>
    <div className={`safety-accordion-content${priority ? " handover" : ""}`}>
      <div className="safety-section-heading"><p className="panel-index">{number} / {label}{badge ? ` · ${badge}` : ""}</p><h2>{title}</h2><p>{description}</p></div>
      <p className="safety-accordion-intro">{description}</p>{children}
    </div>
  </details>;
}
