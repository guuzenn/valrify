import Link from "next/link";
import { formatIndonesianDate, labelIdentifierType } from "@valrify/domain";
import { MobileMenu } from "./components/MobileMenu";
import { SessionNav } from "./components/SessionNav";
import { getRecentCases } from "../lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const recentCases = await getRecentCases();
  return (
    <main>
      <header className="site-header shell">
        <Link className="wordmark" href="/" aria-label="Valrify beranda">VALRIFY<span>{"//"}</span></Link>
        <nav aria-label="Navigasi utama">
          <a href="#cara-kerja">CARA KERJA</a>
          <Link href="/cara-aman">CARA AMANIN</Link>
          <SessionNav />
          <Link href="/submit" className="nav-report">LAPOR SCAM</Link>
        </nav>
        <MobileMenu />
      </header>

      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">{"// CEK PENJUAL ATAU PEMBELI AKUN VALORANT"}</p>
          <h1>CEK SEBELUM<br /><span>TRANSAKSI.</span></h1>
          <p className="lede">Cari nomor WhatsApp, rekening, Discord, Facebook, username Riot / Riot ID, atau nama sebelum membeli, menjual, atau menukar akun Valorant.</p>
        </div>
        <div className="search-panel" id="cek">
          <p className="panel-index">01 / CARI NOMOR ATAU AKUN</p>
          <form action="/search" className="hero-search">
            <label htmlFor="q">MASUKKAN DATA YANG MAU DICEK</label>
            <div className="search-row">
              <input id="q" name="q" required autoComplete="off" placeholder="Nomor, rekening, Discord, Facebook, username Riot..." />
              <button type="submit">CEK SEKARANG <span aria-hidden="true">↗</span></button>
            </div>
          </form>
          <p className="privacy-note"><span aria-hidden="true">◆</span> Nomor dan akun dari laporan yang sudah dicek admin ditampilkan lengkap supaya mudah kamu cocokkan.</p>
        </div>
      </section>

      <section className="trust-strip" aria-label="Prinsip Valrify">
        <div className="shell trust-grid">
          <p><strong>DICEK ADMIN</strong><span>Laporan baru muncul setelah admin mencocokkan cerita, data, dan buktinya.</span></p>
          <p><strong>TETAP CEK SENDIRI</strong><span>Laporan membantu menilai risiko. Cocokkan lagi datanya sebelum kamu memutuskan untuk lanjut transaksi.</span></p>
          <p><strong>BUKTI TETAP DIJAGA</strong><span>Bukti lengkap hanya dilihat admin. Pengunjung hanya melihat bagian yang aman dibagikan.</span></p>
        </div>
      </section>

      <section className="recent-cases shell" aria-labelledby="recent-cases-title">
        <div className="recent-heading">
          <div><p className="eyebrow">{"// BARU DICEK ADMIN"}</p><h2 id="recent-cases-title">SCAM REPORT<br />TERBARU.</h2></div>
          <p>Laporan terbaru yang cerita, data, dan buktinya sudah diperiksa admin.</p>
        </div>
        {recentCases.length === 0 ? <div className="recent-empty"><strong>BELUM ADA LAPORAN YANG DITAMPILKAN.</strong><span>Coba gunakan pencarian untuk mengecek data transaksi.</span></div> : <div className="recent-grid">
          {recentCases.map((report) => <article className="recent-card" data-role={report.uploadedBy.role} key={report.publicId}>
            <div className="recent-card-meta"><span>{report.publicId}</span><time dateTime={report.transactionDate ?? undefined}>KEJADIAN · {formatIndonesianDate(report.transactionDate)}</time></div>
            <h3><Link href={`/case/${report.publicId}`}>{report.title}</Link></h3>
            <Link className="recent-entity-link" href={`/entity/${report.slug}`}><span>NAMA SELLER</span><strong>{report.entityName}</strong><b aria-hidden="true">↗</b></Link>
            {report.primaryIdentifier && <div className="recent-identifier"><span>{labelIdentifierType(report.primaryIdentifier.type)}</span><strong>{report.primaryIdentifier.displayValue}</strong></div>}
            <p>{report.publicSummary}</p>
            <div className="uploader-inline" data-role={report.uploadedBy.role}><span className="uploader-copy"><span>DIKIRIM OLEH</span><strong>{report.uploadedBy.displayName}</strong></span><em>{report.uploadedBy.roleLabel}</em></div>
            <div className="recent-card-footer"><span><small>TANGGAL KEJADIAN</small><strong>{formatIndonesianDate(report.transactionDate)}</strong></span><Link href={`/case/${report.publicId}`}>BACA LAPORAN <span aria-hidden="true">↗</span></Link></div>
          </article>)}
        </div>}
      </section>

      <section className="home-threats" aria-labelledby="home-threats-title">
        <div className="shell home-threats-inner">
          <div className="home-threats-heading">
            <div><p className="eyebrow">{"// MODUS YANG SERING TERJADI"}</p><h2 id="home-threats-title">JANGAN CUMA<br /><span>CEK AKUNNYA.</span></h2></div>
            <div><p>Periksa alur pembayaran, identitas rekber, dan riwayat kepemilikan akun sebelum ada uang yang berpindah.</p><Link href="/cara-aman">BUKA PANDUAN LENGKAP <span aria-hidden="true">→</span></Link></div>
          </div>
          <div className="home-threats-grid">
            <article><span>01 / PEMBAYARAN</span><h3>JANGAN TRANSFER SEBELUM DATA COCOK.</h3><p>Cari nomor rekening, e-wallet, telepon, dan nama yang diberikan. Perbedaan kecil tetap perlu ditanyakan sebelum lanjut.</p><Link href="/search">CEK DATA <span aria-hidden="true">↗</span></Link></article>
            <article><span>02 / REKBER PALSU</span><h3>PASTIKAN KONTAK REKBERNYA ASLI.</h3><p>Waspadai nomor lain, grup tiruan, dan permintaan deposit tambahan. Cari nomor resmi rekber sendiri, jangan hanya percaya kontak yang dikirim seller.</p><Link href="/cara-aman#sebelum-transfer">BACA CHECKLIST <span aria-hidden="true">→</span></Link></article>
            <article><span>03 / HACKBACK</span><h3>RIWAYAT AKUN TETAP PENTING.</h3><p>Email dan password terbaru belum membuktikan kepemilikan asli. Periksa riwayat recovery, FE, serta bukti asal akun sebelum dana dicairkan.</p><Link href="/cara-aman#cek-akun">CARA PERIKSA <span aria-hidden="true">→</span></Link></article>
          </div>
          <aside className="home-threats-alert"><strong>SUDAH TERLANJUR KENA?</strong><p>Simpan chat, bukti transfer, link profil, dan kronologi. Kirim scam report agar admin dapat memeriksa keterkaitan datanya.</p><Link href="/submit">LAPOR SCAM <span aria-hidden="true">↗</span></Link></aside>
        </div>
      </section>

      <section className="how shell" id="cara-kerja">
        <div><p className="eyebrow">{"// CARA PAKAINYA"}</p><h2>CEK DULU.<br />BARU TRANSAKSI.</h2></div>
        <ol>
          <li><span>01</span><div><strong>MASUKKAN DATANYA</strong><p>Bisa nomor WhatsApp, rekening, Discord, Facebook, atau username Riot / Riot ID.</p></div></li>
          <li><span>02</span><div><strong>BACA RIWAYATNYA</strong><p>Lihat laporan dan testi dari pengguna lain.</p></div></li>
          <li><span>03</span><div><strong>TETAP HATI-HATI</strong><p>Belum ada laporan bukan berarti transaksi pasti aman.</p></div></li>
        </ol>
      </section>

      <section className="disclaimer shell">
        <p className="panel-index">CATATAN PENTING</p>
        <p>Laporan diperiksa admin, sedangkan testi langsung tampil dari pengguna. Informasi di Valrify bukan putusan hukum dan bukan jaminan transaksi pasti aman.</p>
      </section>

      <footer className="shell">
        <div className="wordmark">VALRIFY<span>{"//"}</span></div>
        <p>Cek riwayat penjual atau pembeli akun Valorant sebelum transaksi.</p>
        <small>Valrify by reyv · © 2026</small>
      </footer>
    </main>
  );
}
