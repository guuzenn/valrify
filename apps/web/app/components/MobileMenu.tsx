"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SessionNav } from "./SessionNav";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <div className="mobile-menu">
    <Link className="mobile-quick-report" href="/submit">LAPOR SCAM</Link>
    <button className="mobile-menu-trigger" type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Tutup menu" : "Buka menu"} onClick={() => setOpen((value) => !value)}>
      <span /><span /><span />
    </button>
    {open && <>
      <button className="mobile-menu-backdrop" type="button" aria-label="Tutup menu" onClick={() => setOpen(false)} />
      <div className="mobile-menu-panel" id="mobile-navigation">
        <div className="mobile-menu-heading"><span>// MENU</span><button type="button" aria-label="Tutup menu" onClick={() => setOpen(false)}>×</button></div>
        <nav aria-label="Navigasi mobile" onClick={() => setOpen(false)}>
          <Link href="/search"><small>01</small> CEK DATA</Link>
          <Link href="/cara-aman"><small>02</small> CARA AMANIN</Link>
          <SessionNav />
          <Link href="/submit" className="mobile-menu-report">LAPOR SCAM <span aria-hidden="true">↗</span></Link>
        </nav>
      </div>
    </>}
  </div>;
}
