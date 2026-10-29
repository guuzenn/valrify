import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer, Header } from "../components/SiteChrome";
import { AdminLoginForm } from "../components/AdminLoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Login Admin", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ params }: { params: Promise<{ adminEntry: string }> }) {
  const { adminEntry } = await params;
  const configured = process.env.ADMIN_LOGIN_SLUG;
  if (!configured || !/^mgmt-[a-z0-9]{16,64}$/.test(configured) || adminEntry !== configured) notFound();
  return <><Header compact backLabel="Kembali ke beranda"/><main className="page shell narrow auth-flow-page">
    <p className="section-label eyebrow">// AKSES TERBATAS</p><h1 className="page-title">MASUK ADMIN.</h1>
    <AdminLoginForm entry={adminEntry}/>
  </main><Footer/></>;
}
