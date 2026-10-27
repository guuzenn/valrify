import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Footer } from "../components/SiteChrome";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get("valrify_session")?.value;
  if (!token) notFound();
  const response = await fetch(`${process.env.API_URL ?? "http://localhost:3001/api"}/auth/me`, { headers: { Cookie: `valrify_session=${encodeURIComponent(token)}` }, cache: "no-store" });
  if (response.status === 401) notFound();
  if (!response.ok) throw new Error("Panel admin belum bisa diakses. Coba kembali sebentar lagi.");
  const { user } = await response.json() as { user: { role: string } };
  if (!["ADMIN", "MODERATOR"].includes(user.role)) notFound();
  return <><header className="admin-chrome"><div className="shell"><Link href="/admin/reports" className="brand">VALRIFY <small>// ADMIN</small></Link><nav aria-label="Navigasi admin"><Link href="/admin/reports">Laporan</Link><Link href="/admin/community">Moderasi</Link><Link href="/account">Akun & sesi</Link><Link href="/">Buka situs ↗</Link></nav></div></header>{children}<Footer/></>;
}
