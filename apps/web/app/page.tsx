import { ArrowIcon } from "./components/ArrowIcon";
import { SearchForm } from "./components/SearchForm";
import Link from "next/link";
import { formatIndonesianDate } from "@valrify/domain";
import { Footer, Header } from "./components/SiteChrome";
import { getRecentCases, type RecentCase } from "../lib/api";

export const dynamic = "force-dynamic";

function ReportCard({ report }: { report: RecentCase }) {
  return <article className="landing-report-card">
    <h3>{report.entityName}</h3>
    <p>{report.title}</p>
    <time dateTime={report.transactionDate ?? undefined}>{report.transactionDate ? `Kejadian ${formatIndonesianDate(report.transactionDate)}` : "Tanggal tidak dicantumkan"}</time>
    <Link href={`/case/${report.publicId}`}>Baca laporan <ArrowIcon/></Link>
  </article>;
}

export default async function Home() {
  const recentCases = await getRecentCases();
  return <main className="home-page">
    <Header home/>
    <section className="hero shell">
      <div className="hero-copy">
        <h1>Cek sebelum<br/><span>transaksi.</span></h1>
        <p className="lede">Cari riwayat laporan penjual atau pembeli akun Valorant.</p>
      </div>
      <div className="search-panel" id="cek">
        <SearchForm className="hero-search">
          <label htmlFor="q">Nomor atau nama akun</label>
          <div className="search-row">
            <input id="q" name="q" required autoComplete="off" placeholder="Ketik data yang ingin dicek" aria-describedby="home-search-help"/>
            <button type="submit">Cek sekarang <ArrowIcon/></button>
          </div>
          <p id="home-search-help" className="landing-search-help">Bisa nomor rekening, WhatsApp, atau username.</p>
        </SearchForm>
        <p className="landing-search-note">Belum ada laporan bukan berarti aman.</p>
      </div>
    </section>
    <div className="landing-reports-band"><section className="landing-reports shell" aria-labelledby="recent-cases-title">
      <h2 id="recent-cases-title">Laporan terbaru</h2>
      {recentCases.length === 0 ? <p className="landing-empty">Belum ada laporan yang ditampilkan.</p> : <div className="landing-report-grid">
        {recentCases.slice(0, 3).map(report => <ReportCard key={report.publicId} report={report}/>)}
      </div>}
      {recentCases.length > 3 && <details className="landing-more">
        <summary>Tampilkan laporan lainnya</summary>
        <div className="landing-report-grid">{recentCases.slice(3).map(report => <ReportCard key={report.publicId} report={report}/>)}</div>
      </details>}
    </section></div>
    <div className="landing-help-band"><section className="landing-help shell" aria-label="Bantuan transaksi">
      <div><h2>Sebelum transfer, cek langkah amannya.</h2><Link href="/cara-aman">Baca panduan keamanan <ArrowIcon/></Link></div>
      <div><h2>Mengalami masalah transaksi?</h2><Link href="/submit">Kirim laporan <ArrowIcon/></Link></div>
    </section></div>
    <aside className="landing-disclaimer shell">Laporan berasal dari komunitas. Informasi ini bukan putusan hukum atau jaminan transaksi aman.</aside>
    <Footer/>
  </main>;
}
