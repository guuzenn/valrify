import { NavigationLink as Link } from "./NavigationLink";
import { SessionNav } from "./SessionNav";

export const siteLinks = [
  { href: "/search", label: "Cek akun" },
  { href: "/cara-aman", label: "Panduan transaksi" },
  { href: "/rekber", label: "Rekber" },
];

export function SiteNavigation({ home = false }: { home?: boolean }) {
  return <nav aria-label="Navigasi utama">
    {siteLinks.map(link => <Link key={link.href} href={home && link.href === "/search" ? "#cek" : link.href}>{link.label}</Link>)}
    <SessionNav/>
    <Link href="/submit" className="nav-report">Laporkan</Link>
  </nav>;
}
