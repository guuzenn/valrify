import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AdminSidebar } from "../components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get("valrify_session")?.value;
  if (!token) notFound();
  const response = await fetch(`${process.env.API_URL ?? "http://localhost:3001/api"}/auth/me`, { headers: { Cookie: `valrify_session=${encodeURIComponent(token)}` }, cache: "no-store" });
  if (response.status === 401) notFound();
  if (!response.ok) throw new Error("Panel admin belum bisa diakses. Coba kembali sebentar lagi.");
  const { user } = await response.json() as { user: { role: string; displayName: string } };
  if (!["ADMIN", "MODERATOR"].includes(user.role)) notFound();
  return <div className="operations-layout"><AdminSidebar role={user.role} name={user.displayName}/><div className="operations-content">{children}<footer className="operations-footer">VALRIFY // ADMIN WORKSPACE <span>Data privat · Gunakan sesuai wewenang</span></footer></div></div>;
}
