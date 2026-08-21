import Link from "next/link";
import { SessionNav } from "./SessionNav";

export function Header({ compact=false }:{compact?:boolean}) {
  return <header className={`site-header shell ${compact?"compact":""}`}><Link className="wordmark" href="/" aria-label="VLRFY beranda">VLRFY<span>{"//"}</span></Link><nav aria-label="Navigasi utama"><Link href="/search">CEK</Link><Link href="/methodology">CARA BACA</Link><SessionNav/><Link href="/submit" className="nav-report">LAPORKAN</Link></nav></header>;
}
export function Footer(){return <footer className="shell"><div className="wordmark">VLRFY<span>{"//"}</span></div><p>Cek riwayat penjual atau pembeli akun Valorant sebelum transaksi.</p><small>VLRFY by reyv · © 2026</small></footer>}
export function Disclaimer(){return <aside className="inline-disclaimer"><strong>INGAT</strong><span>VLRFY cuma menampilkan laporan dan testi yang sudah dicek admin. Ini bukan putusan hukum dan bukan jaminan transaksi pasti aman.</span></aside>}
