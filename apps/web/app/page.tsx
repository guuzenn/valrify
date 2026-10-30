import { ArrowIcon } from "./components/ArrowIcon";
import { SearchForm } from "./components/SearchForm";
import Link from "next/link";
import { Footer, Header } from "./components/SiteChrome";
import { getRecentCases } from "../lib/api";
import { ReportCard } from "./components/ReportCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const recentCases = await getRecentCases();
  return <main className="home-page">
    <Header home/>
    <section className="hero shell">
      <div className="hero-copy">
        <h1>Cek sebelum<br/><span>transaksi.</span></h1>
        <p className="lede">Cari riwayat laporan penjual atau pembeli akun Valorant.</p>
      </div>
      <SearchForm/>
    </section>
    <div className="landing-reports-band"><section className="landing-reports shell" aria-labelledby="recent-cases-title">
      <h2 id="recent-cases-title">Laporan terbaru</h2>
      {recentCases.length === 0 ? <p className="landing-empty">Belum ada laporan yang ditampilkan.</p> : <div className="report-grid">
        {recentCases.slice(0, 3).map(report => <ReportCard key={report.publicId} report={report}/>)}
      </div>}
      <Link className="all-reports-link" href="/laporan">Lihat semua laporan <ArrowIcon direction="right"/></Link>
    </section></div>
    <div className="landing-help-band"><section className="landing-help shell" aria-label="Bantuan transaksi">
      <div><h2>Sebelum transfer, cek langkah amannya.</h2><Link href="/cara-aman">Baca panduan keamanan <ArrowIcon/></Link></div>
      <div><h2>Mengalami masalah transaksi?</h2><Link href="/submit">Kirim laporan <ArrowIcon/></Link></div>
    </section></div>
    <aside className="landing-disclaimer shell">Laporan berasal dari komunitas. Informasi ini bukan putusan hukum atau jaminan transaksi aman.</aside>
    <Footer/>
  </main>;
}
