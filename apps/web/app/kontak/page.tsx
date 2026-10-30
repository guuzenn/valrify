import { ContactForm } from "../components/ContactForm";
import { ArrowIcon } from "../components/ArrowIcon";
import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: "Kontak & Saran",
  description: "Hubungi admin Valrify untuk pertanyaan, saran, koreksi laporan, atau permintaan terkait data pribadi.",
};

export default function ContactPage() {
  return <><Header compact backLabel="Kembali ke beranda"/><main className="page shell info-page contact-page">
    <div className="contact-hero">
      <div className="info-hero"><p className="section-label eyebrow">// KONTAK VALRIFY</p>
        <h1 className="page-title">ADA YANG<br/>MAU <span>DISAMPAIKAN?</span></h1>
        <p className="page-intro">Punya saran, pertanyaan, atau menemukan informasi yang keliru? Kami siap membaca pesanmu.</p>
      </div>
      <aside className="contact-email" aria-label="Email resmi Valrify">
        <span className="panel-index">LANGSUNG KE ADMIN</span>
        <h2>Mulai dari satu pesan.</h2>
        <a className="contact-address" href="mailto:support@valrify.app">support@valrify.app</a>
        <a className="tactical-button" href="#pesan">TULIS PESAN <ArrowIcon direction="right"/></a>
        <p>Kirim pesan lewat formulir di bawah. Admin dapat membalas ke email yang kamu isi.</p>
      </aside>
    </div>

    <section className="contact-topics" aria-labelledby="contact-topics-title">
      <div className="contact-section-heading"><h2 id="contact-topics-title">Mau membahas apa?</h2><p>Saran, koreksi, atau pertanyaan bisa dikirim lewat formulir di bawah.</p></div>
      <div className="contact-topic-grid">
        <a className="contact-topic" href="#pesan"><span className="panel-index">01 / SARAN & PERTANYAAN</span><h3>Bantu Valrify jadi lebih baik.</h3><p>Ceritakan idemu, pengalaman memakai situs, atau hal yang ingin kamu tanyakan.</p><span className="contact-topic-action">Kirim saran atau pertanyaan <ArrowIcon direction="right"/></span></a>
        <a className="contact-topic" href="#pesan"><span className="panel-index">02 / KOREKSI LAPORAN</span><h3>Ada informasi yang keliru?</h3><p>Sertakan tautan laporan, bagian yang salah, hubunganmu dengan laporan, dan bukti pendukung.</p><span className="contact-topic-action">Minta koreksi data <ArrowIcon direction="right"/></span></a>
        <a className="contact-topic" href="#pesan"><span className="panel-index">03 / DATA PRIBADI</span><h3>Urus data milikmu.</h3><p>Untuk melihat, mengubah, atau meminta penghapusan data, jelaskan data yang dimaksud dan permintaanmu.</p><span className="contact-topic-action">Hubungi soal privasi <ArrowIcon direction="right"/></span></a>
        <a className="contact-topic" href="#pesan"><span className="panel-index">04 / MASALAH SITUS</span><h3>Ada yang tidak berjalan?</h3><p>Sertakan halaman, langkah yang kamu lakukan, dan perangkat yang dipakai. Laporkan celah keamanan lewat formulir ini juga.</p><span className="contact-topic-action">Laporkan masalah <ArrowIcon direction="right"/></span></a>
      </div>
    </section>

    <ContactForm/>
    <div className="contact-notes">
      <aside className="info-notice"><strong>Sebelum mengirim</strong><p>Tutup data pribadi yang tidak diperlukan pada bukti atau tangkapan layar. Jangan kirim kata sandi, kode verifikasi (OTP), atau kode pemulihan akun. Jika menemukan kebocoran data, jangan bagikan data atau cara memanfaatkannya ke publik.</p><p>Admin memeriksa permintaan terlebih dahulu. Mengirim pesan tidak langsung mengubah atau menghapus laporan.</p></aside>
      <aside className="contact-official"><h2>Pastikan kontaknya resmi.</h2><p>Gunakan <strong>support@valrify.app</strong>. Kontak lain yang tidak tercantum di sini belum dipastikan milik admin Valrify.</p><p>Admin tidak meminta biaya agar laporan ditampilkan. Valrify tidak menjalankan rekber atau meminta uang muka transaksi.</p><Link href="/privasi">Baca kebijakan privasi <ArrowIcon direction="right"/></Link></aside>
    </div>
    <div className="contact-report"><div><h2>Ingin melaporkan penipuan?</h2><p>Kirim lewat formulir agar cerita dan buktinya bisa diperiksa.</p></div><Link className="tactical-button" href="/submit">BUAT LAPORAN <ArrowIcon direction="right"/></Link></div>
  </main><Footer/></>;
}
