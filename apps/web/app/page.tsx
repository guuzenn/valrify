import Link from "next/link";

export default function Home() {
  return (
    <main>
      <header className="site-header shell">
        <Link className="wordmark" href="/" aria-label="VLRFY beranda">VLRFY<span>{"//"}</span></Link>
        <nav aria-label="Navigasi utama">
          <a href="#cara-kerja">CARA KERJA</a>
          <Link href="/methodology">METODOLOGI</Link>
          <Link href="/submit" className="nav-report">LAPORKAN</Link>
        </nav>
      </header>

      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">{"// PLATFORM REPUTASI KOMUNITAS VALORANT INDONESIA"}</p>
          <h1>CEK SEBELUM<br /><span>TRANSAKSI.</span></h1>
          <p className="lede">Cari nomor WhatsApp, rekening, Discord, Facebook, Riot ID, atau nama sebelum membeli, menjual, atau menukar akun Valorant.</p>
        </div>
        <div className="search-panel" id="cek">
          <p className="panel-index">01 / PENCARIAN IDENTITAS</p>
          <form action="/search" className="hero-search">
            <label htmlFor="q">IDENTIFIER YANG INGIN DIPERIKSA</label>
            <div className="search-row">
              <input id="q" name="q" required autoComplete="off" placeholder="Nomor, rekening, Discord, Facebook, Riot ID..." />
              <button type="submit">CEK SEKARANG <span aria-hidden="true">↗</span></button>
            </div>
          </form>
          <p className="privacy-note"><span aria-hidden="true">◆</span> Pencarian exact-match. Identifier sensitif tetap disamarkan.</p>
        </div>
      </section>

      <section className="trust-strip" aria-label="Prinsip VLRFY">
        <div className="shell trust-grid">
          <p><strong>BUKTI</strong><span>Setiap laporan ditinjau sebelum dipublikasikan.</span></p>
          <p><strong>NETRAL</strong><span>Sinyal risiko, bukan penetapan bersalah.</span></p>
          <p><strong>PRIVASI</strong><span>Bukti mentah tidak pernah tampil ke publik.</span></p>
        </div>
      </section>

      <section className="how shell" id="cara-kerja">
        <div><p className="eyebrow">{"// CARA VLRFY BEKERJA"}</p><h2>KEPUTUSAN LEBIH BAIK<br />DIMULAI DARI KONTEKS.</h2></div>
        <ol>
          <li><span>01</span><div><strong>CARI IDENTIFIER</strong><p>Tempel identitas yang digunakan lawan transaksi.</p></div></li>
          <li><span>02</span><div><strong>PERIKSA SINYAL</strong><p>Lihat profil, laporan terverifikasi, dan alasan label risiko.</p></div></li>
          <li><span>03</span><div><strong>PUTUSKAN DENGAN SADAR</strong><p>Tidak adanya laporan bukan jaminan transaksi bebas risiko.</p></div></li>
        </ol>
      </section>

      <section className="disclaimer shell">
        <p className="panel-index">CATATAN PENTING</p>
        <p>Penilaian di VLRFY didasarkan pada laporan, bukti, dan sinyal komunitas yang tersedia. VLRFY bukan lembaga penegak hukum dan tidak menetapkan seseorang bersalah secara hukum.</p>
      </section>

      <footer className="shell">
        <div className="wordmark">VLRFY<span>{"//"}</span></div>
        <p>Platform reputasi dan pemeriksaan risiko untuk transaksi akun Valorant Indonesia.</p>
        <small>VLRFY by reyv · © 2026</small>
      </footer>
    </main>
  );
}
