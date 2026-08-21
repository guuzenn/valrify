import Link from "next/link";

export function Header({ compact=false }:{compact?:boolean}) {
  return <header className={`site-header shell ${compact?"compact":""}`}><Link className="wordmark" href="/" aria-label="VLRFY beranda">VLRFY<span>{"//"}</span></Link><nav aria-label="Navigasi utama"><Link href="/search">CEK</Link><Link href="/methodology">METODOLOGI</Link><Link href="/admin/reports">REVIEW</Link><Link href="/submit" className="nav-report">LAPORKAN</Link></nav></header>;
}
export function Footer(){return <footer className="shell"><div className="wordmark">VLRFY<span>{"//"}</span></div><p>Platform reputasi dan pemeriksaan risiko transaksi akun Valorant Indonesia.</p><small>VLRFY by reyv · © 2026</small></footer>}
export function Disclaimer(){return <aside className="inline-disclaimer"><strong>CATATAN</strong><span>Penilaian didasarkan pada laporan, bukti, dan sinyal komunitas yang tersedia. VLRFY bukan lembaga penegak hukum dan tidak menetapkan seseorang bersalah secara hukum.</span></aside>}
