import Link from "next/link";
import { formatIndonesianDate, formatRupiah, labelIdentifierType } from "@valrify/domain";
import { MobileMenu } from "./components/MobileMenu";
import { SessionNav } from "./components/SessionNav";
import { getCommunityPosts, getRecentCases } from "../lib/api";

export const dynamic = "force-dynamic";

function communityRoleLabel(role: string) {
  return ({ USER: "ANGGOTA", VERIFIED_MIDDLEMAN: "VERIFIED MIDDLEMAN", MODERATOR: "MODERATOR", ADMIN: "ADMIN" } as Record<string, string>)[role] ?? role;
}

function formatCommunityDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export default async function Home() {
  const [recentCases, popularCommunityPosts] = await Promise.all([getRecentCases(), getCommunityPosts("popular")]);
  const topCommunityPosts = popularCommunityPosts.filter((post) => post.likeCount > 0 || post.commentCount > 0).slice(0, 3);
  return (
    <main>
      <header className="site-header shell">
        <Link className="wordmark" href="/" aria-label="Valrify beranda">VALRIFY<span>{"//"}</span></Link>
        <nav aria-label="Navigasi utama">
          <a href="#cara-kerja">CARA KERJA</a>
          <Link href="/community">COMMUNITY</Link>
          <Link href="/cara-aman">CARA AMANIN</Link>
          <Link href="/methodology">CARA BACA</Link>
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
          <p className="privacy-note"><span aria-hidden="true">◆</span> Identifier dari scam report yang sudah dicek admin ditampilkan lengkap agar mudah dicocokkan.</p>
        </div>
      </section>

      <section className="trust-strip" aria-label="Prinsip Valrify">
        <div className="shell trust-grid">
          <p><strong>DICEK DULU</strong><span>Admin memeriksa laporan sebelum ditayangkan.</span></p>
          <p><strong>TIDAK ASAL TUDUH</strong><span>Ada laporan bukan berarti orangnya pasti menipu.</span></p>
          <p><strong>BUKTI TERKONTROL</strong><span>Hanya bukti yang disetujui admin yang tampil ke publik.</span></p>
        </div>
      </section>

      <section className="recent-cases shell" aria-labelledby="recent-cases-title">
        <div className="recent-heading">
          <div><p className="eyebrow">{"// BARU DICEK ADMIN"}</p><h2 id="recent-cases-title">SCAM REPORT<br />TERBARU.</h2></div>
          <p>Laporan terbaru dari komunitas yang sudah melewati pengecekan admin.</p>
        </div>
        {recentCases.length === 0 ? <div className="recent-empty"><strong>BELUM ADA SCAM REPORT TERBIT.</strong><span>Coba gunakan pencarian untuk mengecek data transaksi.</span></div> : <div className="recent-grid">
          {recentCases.map((report) => <article className="recent-card" data-role={report.uploadedBy.role} key={report.publicId}>
            <div className="recent-card-meta"><span>{report.publicId}</span><time dateTime={report.transactionDate ?? undefined}>KEJADIAN · {formatIndonesianDate(report.transactionDate)}</time></div>
            <h3><Link href={`/case/${report.publicId}`}>{report.title}</Link></h3>
            <Link className="recent-entity-link" href={`/entity/${report.slug}`}><span>NAMA SELLER</span><strong>{report.entityName}</strong><b aria-hidden="true">↗</b></Link>
            {report.primaryIdentifier && <div className="recent-identifier"><span>{labelIdentifierType(report.primaryIdentifier.type)}</span><strong>{report.primaryIdentifier.displayValue}</strong></div>}
            <p>{report.publicSummary}</p>
            <div className="uploader-inline" data-role={report.uploadedBy.role}><span className="uploader-copy"><span>DIUPLOAD OLEH</span><strong>{report.uploadedBy.displayName}</strong></span><em>{report.uploadedBy.roleLabel}</em></div>
            <div className="recent-card-footer"><span><small>DILAPORKAN HILANG</small><strong>{formatRupiah(report.allegedLoss)}</strong></span><Link href={`/case/${report.publicId}`}>BACA REPORT <span aria-hidden="true">↗</span></Link></div>
          </article>)}
        </div>}
      </section>

      <section className="home-community" aria-labelledby="home-community-title">
        <div className="shell home-community-inner">
          <div className="home-community-heading">
            <div><p className="eyebrow">{"// OBROLAN 30 HARI TERAKHIR"}</p><h2 id="home-community-title">LAGI RAMAI DI<br /><span>COMMUNITY.</span></h2></div>
            <div><p>Lihat tips, pengalaman transaksi, dan diskusi yang sedang ramai dibicarakan anggota Valrify.</p><Link href="/community">BUKA COMMUNITY <span aria-hidden="true">→</span></Link></div>
          </div>
          {topCommunityPosts.length === 0 ? <div className="home-community-empty"><strong>BELUM ADA OBROLAN RAMAI.</strong><p>Mulai post pertama dan ajak komunitas berdiskusi.</p><Link href="/community">MULAI NGOBROL →</Link></div> : <div className="home-community-grid">{topCommunityPosts.map((post, index) => <article key={post.id}>
            <div className="home-community-rank"><strong>#{index + 1}</strong><span>LAGI RAMAI</span></div>
            <Link className="home-community-author" href={`/u/${post.authorUsername}`}><span>{post.authorDisplayName.slice(0, 1).toUpperCase()}</span><div><strong>{post.authorDisplayName}</strong><small>@{post.authorUsername} · {communityRoleLabel(post.authorRole)}</small></div></Link>
            <p>{post.body}</p>
            <div className="home-community-meta"><span><strong>{post.likeCount}</strong> SUKA</span><span><strong>{post.commentCount}</strong> BALASAN</span><time dateTime={post.createdAt}>{formatCommunityDate(post.createdAt)}</time></div>
            <Link className="home-community-open" href={`/community/post/${post.id}`}>BUKA DISKUSI <span aria-hidden="true">→</span></Link>
          </article>)}</div>}
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
        <p>Valrify cuma menampilkan laporan dan testi yang sudah dicek admin. Ini bukan putusan hukum dan bukan jaminan transaksi pasti aman.</p>
      </section>

      <footer className="shell">
        <div className="wordmark">VALRIFY<span>{"//"}</span></div>
        <p>Cek riwayat penjual atau pembeli akun Valorant sebelum transaksi.</p>
        <small>Valrify by reyv · © 2026</small>
      </footer>
    </main>
  );
}
