"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowIcon } from "./ArrowIcon";

const links = [
  { href: "/admin", label: "Beranda", index: "01" },
  { href: "/admin/users", label: "Pengguna & Role", index: "02", adminOnly: true },
  { href: "/admin/reports", label: "Laporan", index: "03" },
  { href: "/admin/directory", label: "Direktori Rekber", index: "05", adminOnly: true },
  { href: "/admin/activity", label: "Riwayat Aktivitas", index: "06", adminOnly: true },
  { href: "/admin/security", label: "Keamanan", index: "07" },
];

export function AdminSidebar({ role, name }: { role: string; name: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return <aside className={`operations-sidebar ${open ? "is-open" : ""}`}>
    <div className="operations-brand"><Link href="/admin">VALRIFY<span className="section-label">//</span><small>CONTROL ROOM</small></Link><button type="button" className="operations-menu-toggle" aria-expanded={open} aria-controls="operations-navigation" onClick={() => setOpen(!open)}>{open ? "TUTUP" : "MENU"}</button></div>
    <nav id="operations-navigation" aria-label="Navigasi admin">{links.filter(link => !link.adminOnly || role === "ADMIN").map(link => <Link key={link.href} href={link.href} aria-current={(link.href === "/admin" ? path === link.href : path.startsWith(link.href)) ? "page" : undefined} onClick={() => setOpen(false)}><span>{link.index}</span>{link.label}<ArrowIcon direction="right"/></Link>)}</nav>
    <div className="operations-operator"><span className="admin-live-dot"/><strong>{name}</strong><small>{role === "ADMIN" ? "ADMINISTRATOR" : "MODERATOR"} · MFA AKTIF</small><Link href="/account">Akun & sesi <ArrowIcon/></Link><Link href="/">Kembali ke situs <ArrowIcon/></Link></div>
  </aside>;
}
