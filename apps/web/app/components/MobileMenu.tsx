"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SessionNav } from "./SessionNav";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      dialog.close();
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  return <div className="mobile-menu">
    <Link className="mobile-quick-report" href="/submit">LAPOR SCAM</Link>
    <button ref={triggerRef} className="mobile-menu-trigger" type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Tutup menu" : "Buka menu"} onClick={() => setOpen((value) => !value)}>
      <span /><span /><span />
    </button>
    {open && <dialog ref={dialogRef} className="mobile-menu-panel" id="mobile-navigation" aria-label="Navigasi mobile" onCancel={() => setOpen(false)} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div className="mobile-menu-heading"><span>// MENU</span><button type="button" aria-label="Tutup menu" onClick={() => setOpen(false)}>×</button></div>
        <nav aria-label="Navigasi mobile" onClick={() => setOpen(false)}>
          <Link href="/search"><small>01</small> CEK DATA</Link>
          <Link href="/cara-aman"><small>02</small> CARA AMANIN</Link>
          <Link href="/rekber"><small>03</small> REKOMENDASI REKBER</Link>
          <SessionNav />
          <Link href="/submit" className="mobile-menu-report">LAPOR SCAM <span aria-hidden="true">↗</span></Link>
        </nav>
    </dialog>}
  </div>;
}
