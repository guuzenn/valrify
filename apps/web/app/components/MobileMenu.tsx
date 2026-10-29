"use client";

import { ArrowIcon } from "./ArrowIcon";
import { NavigationLink as Link } from "./NavigationLink";
import { useEffect, useRef, useState } from "react";
import { siteLinks } from "./SiteNavigation";
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
    <Link className="mobile-quick-report" href="/submit">Laporkan</Link>
    <button ref={triggerRef} className="mobile-menu-trigger" type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Tutup menu" : "Buka menu"} onClick={() => setOpen((value) => !value)}>
      <span /><span /><span />
    </button>
    {open && <dialog ref={dialogRef} className="mobile-menu-panel" id="mobile-navigation" aria-label="Navigasi mobile" onCancel={() => setOpen(false)} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div className="mobile-menu-heading"><span className="section-label">// MENU</span><button type="button" aria-label="Tutup menu" onClick={() => setOpen(false)}>×</button></div>
        <nav aria-label="Navigasi mobile" onClick={() => setOpen(false)}>
          {siteLinks.map((link, index) => <Link key={link.href} href={link.href}><small>{String(index + 1).padStart(2, "0")}</small>{link.label}</Link>)}
          <SessionNav />
          <Link href="/submit" className="mobile-menu-report">Laporkan <span aria-hidden="true"><ArrowIcon/></span></Link>
        </nav>
    </dialog>}
  </div>;
}
