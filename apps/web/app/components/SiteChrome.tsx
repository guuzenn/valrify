import Link from "next/link";
import { MobileMenu } from "./MobileMenu";
import { SessionNav } from "./SessionNav";

export function Header({ compact=false, backHref="/", backLabel="Kembali" }:{compact?:boolean;backHref?:string;backLabel?:string}) {
  return <><header className={`site-header shell ${compact?"compact":""}`}><Link className="wordmark" href="/" aria-label="Valrify beranda">VALRIFY<span>{"//"}</span></Link><nav aria-label="Navigasi utama"><Link href="/search">CEK</Link><Link href="/cara-aman">CARA AMANIN</Link><SessionNav/><Link href="/submit" className="nav-report">LAPOR SCAM</Link></nav><MobileMenu/></header><div className="mobile-back-row shell"><Link href={backHref}><span aria-hidden="true">←</span> {backLabel}</Link></div></>;
}
export function Footer(){return <footer className="shell"><div className="wordmark">VALRIFY<span>{"//"}</span></div><p>Cek riwayat penjual atau pembeli akun Valorant sebelum transaksi.</p><small>Valrify by reyv · © 2026</small></footer>}
export function Disclaimer(){return <aside className="inline-disclaimer"><strong>INGAT</strong><span>Laporan diperiksa admin, sedangkan testi langsung tampil dari pengguna. Informasi di Valrify bukan putusan hukum dan bukan jaminan transaksi pasti aman.</span></aside>}
