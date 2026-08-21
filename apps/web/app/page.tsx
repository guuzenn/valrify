import Link from "next/link";
import { SessionNav } from "./components/SessionNav";

export default function Home() {
  return (
    <main>
      <header className="site-header shell">
        <Link className="wordmark" href="/" aria-label="VLRFY beranda">VLRFY<span>{"//"}</span></Link>
        <nav aria-label="Navigasi utama">
          <a href="#cara-kerja">CARA KERJA</a>
          <Link href="/methodology">CARA BACA</Link>
          <SessionNav />
          <Link href="/submit" className="nav-report">LAPORKAN</Link>
        </nav>
      </header>

      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">{"// CEK PENJUAL ATAU PEMBELI AKUN VALORANT"}</p>
          <h1>CEK SEBELUM<br /><span>TRANSAKSI.</span></h1>
          <p className="lede">Cari nomor WhatsApp, rekening, Discord, Facebook, Riot ID, atau nama sebelum membeli, menjual, atau menukar akun Valorant.</p>
        </div>
        <div className="search-panel" id="cek">
          <p className="panel-index">01 / CARI NOMOR ATAU AKUN</p>
          <form action="/search" className="hero-search">
            <label htmlFor="q">MASUKKAN DATA YANG MAU DICEK</label>
            <div className="search-row">
              <input id="q" name="q" required autoComplete="off" placeholder="Nomor, rekening, Discord, Facebook, Riot ID..." />
              <button type="submit">CEK SEKARANG <span aria-hidden="true">↗</span></button>
            </div>
          </form>
          <p className="privacy-note"><span aria-hidden="true">◆</span> Hasil muncul kalau datanya cocok. Nomor sensitif tetap disensor.</p>
        </div>
      </section>

      <section className="trust-strip" aria-label="Prinsip VLRFY">
        <div className="shell trust-grid">
          <p><strong>DICEK DULU</strong><span>Admin memeriksa laporan sebelum ditayangkan.</span></p>
          <p><strong>TIDAK ASAL TUDUH</strong><span>Ada laporan bukan berarti orangnya pasti menipu.</span></p>
          <p><strong>DATA DISENSOR</strong><span>Bukti asli hanya bisa dilihat admin.</span></p>
        </div>
      </section>

      <section className="how shell" id="cara-kerja">
        <div><p className="eyebrow">{"// CARA PAKAINYA"}</p><h2>CEK DULU.<br />BARU TRANSAKSI.</h2></div>
        <ol>
          <li><span>01</span><div><strong>MASUKKAN DATANYA</strong><p>Bisa nomor WhatsApp, rekening, Discord, Facebook, atau Riot ID.</p></div></li>
          <li><span>02</span><div><strong>BACA RIWAYATNYA</strong><p>Lihat laporan dan testi dari pengguna lain.</p></div></li>
          <li><span>03</span><div><strong>TETAP HATI-HATI</strong><p>Belum ada laporan bukan berarti transaksi pasti aman.</p></div></li>
        </ol>
      </section>

      <section className="disclaimer shell">
        <p className="panel-index">CATATAN PENTING</p>
        <p>VLRFY cuma menampilkan laporan dan testi yang sudah dicek admin. Ini bukan putusan hukum dan bukan jaminan transaksi pasti aman.</p>
      </section>

      <footer className="shell">
        <div className="wordmark">VLRFY<span>{"//"}</span></div>
        <p>Cek riwayat penjual atau pembeli akun Valorant sebelum transaksi.</p>
        <small>VLRFY by reyv · © 2026</small>
      </footer>
    </main>
  );
}
