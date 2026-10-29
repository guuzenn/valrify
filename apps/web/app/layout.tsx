import type { Metadata } from "next";
import "./globals.css";
import "./ui-consistency.css";

export async function generateMetadata():Promise<Metadata>{
  const origin = new URL(process.env.PUBLIC_APP_URL ?? (process.env.NODE_ENV === "production" ? "https://valrify.app" : "http://localhost:3000")).origin;const title="Valrify — Cek Sebelum Transaksi";const description="Cek riwayat penjual atau pembeli akun Valorant sebelum transaksi.";
  return {metadataBase:new URL(origin),title:{default:title,template:"%s — Valrify"},description,icons:{icon:"/favicon.svg"},openGraph:{title,description,type:"website",locale:"id_ID",images:[{url:`${origin}/og.png`,width:1731,height:909,alt:"Valrify — Cek Sebelum Transaksi"}]},twitter:{card:"summary_large_image",title,description,images:[`${origin}/og.png`]}};
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
