import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: "Kontak & Koreksi",
  description: "Informasi admin Valrify, kontak resmi, dan cara menyiapkan permintaan perbaikan data laporan.",
};

export default function ContactPage() {
  return <><Header compact backLabel="Kembali ke beranda"/><main className="page shell narrow info-page">
    <div className="info-hero"><p className="eyebrow">// ADMIN VALRIFY</p>
    <h1 className="page-title">KONTAK &<br/>KOREKSI DATA.</h1>
    <p className="page-intro">Valrify dikelola oleh reyv. Selama beta, semua laporan diperiksa langsung oleh satu admin.</p></div>
    <aside className="info-notice"><strong>Email resmi Valrify</strong><p>Untuk pertanyaan, koreksi data, atau laporan masalah, kirim email ke <a href="mailto:support@valrify.app"><u>support@valrify.app</u></a>. Pesan akan diperiksa langsung oleh admin.</p></aside>

    <section><h2>Ada data yang salah?</h2><p>Jika laporan keliru atau nomor sudah berganti pemilik, siapkan:</p><ul><li>Link laporan atau profil yang perlu diperiksa.</li><li>Bagian yang salah dan perubahan yang kamu minta.</li><li>Penjelasan apakah kamu pemilik nomor, akun, atau pihak yang terlibat.</li><li>Bukti pendukung. Tutup data pribadi yang tidak diperlukan.</li></ul><p>Admin perlu memeriksa bukti sebelum mengubah data. Halaman ini tidak otomatis mengubah atau menghapus laporan.</p></section>
    <section><h2>Ingin melihat, mengubah, atau menghapus datamu?</h2><p>Kirim penjelasan tentang data yang dimaksud dan apa yang kamu minta ke <a href="mailto:support@valrify.app">support@valrify.app</a>. Jangan bagikan email akun, dokumen identitas, atau bukti yang hanya untuk admin di posting publik.</p></section>
    <section><h2>Menemukan bug atau masalah keamanan?</h2><p>Catat halaman yang bermasalah, langkah yang kamu lakukan, hasil yang seharusnya muncul, dan perangkat atau browser yang dipakai. Jika menyertakan screenshot, tutup email, data login, dan informasi pribadi.</p><p>Jika ada kebocoran data atau celah keamanan, laporkan secara privat ke <a href="mailto:support@valrify.app">support@valrify.app</a>. Jangan bagikan cara memanfaatkannya atau data yang bocor ke publik.</p></section>
    <section><h2>Pastikan kontaknya resmi</h2><p>Domain resmi Valrify adalah <strong>valrify.app</strong> dan alamat kontaknya <a href="mailto:support@valrify.app">support@valrify.app</a>. Kontak lain yang belum tercantum di halaman ini belum dipastikan milik admin Valrify.</p><p>Admin tidak meminta password, OTP, recovery code, atau biaya agar laporan ditampilkan. Valrify tidak menjalankan rekber dan tidak meminta deposit transaksi.</p></section>
    <div className="info-actions"><Link className="tactical-button" href="/submit">KIRIM LAPORAN SCAM</Link><Link href="/privasi">Baca kebijakan privasi <span aria-hidden="true">→</span></Link></div>
  </main><Footer/></>;
}
