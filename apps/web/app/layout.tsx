import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata():Promise<Metadata>{
  const requestHeaders=await headers();const host=requestHeaders.get("x-forwarded-host")??requestHeaders.get("host")??"localhost:3000";const protocol=requestHeaders.get("x-forwarded-proto")??(host.startsWith("localhost")?"http":"https");const origin=`${protocol}://${host}`;const title="VLRFY — Cek Sebelum Transaksi";const description="Cek riwayat penjual atau pembeli akun Valorant sebelum transaksi.";
  return {metadataBase:new URL(origin),title:{default:title,template:"%s — VLRFY"},description,icons:{icon:"/favicon.svg"},openGraph:{title,description,type:"website",locale:"id_ID",images:[{url:`${origin}/og.png`,width:1731,height:909,alt:"VLRFY — Cek Sebelum Transaksi"}]},twitter:{card:"summary_large_image",title,description,images:[`${origin}/og.png`]}};
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
