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
    <aside className="info-notice"><strong>Kontak resmi masih disiapkan</strong><p>Email atau kontak admin belum tersedia. Kamu belum bisa mengirim pesan dari halaman ini. Kontak resmi akan ditambahkan di sini setelah siap.</p></aside>

    <section><h2>Ada data yang salah?</h2><p>Jika laporan keliru atau nomor sudah berganti pemilik, siapkan:</p><ul><li>Link laporan atau profil yang perlu diperiksa.</li><li>Bagian yang salah dan perubahan yang kamu minta.</li><li>Penjelasan apakah kamu pemilik nomor, akun, atau pihak yang terlibat.</li><li>Bukti pendukung. Tutup data pribadi yang tidak diperlukan.</li></ul><p>Admin perlu memeriksa bukti sebelum mengubah data. Halaman ini tidak otomatis mengubah atau menghapus laporan.</p></section>
    <section><h2>Ingin melihat, mengubah, atau menghapus datamu?</h2><p>Siapkan penjelasan tentang data yang dimaksud dan apa yang kamu minta. Jangan bagikan email akun, dokumen identitas, atau bukti yang hanya untuk admin di posting publik. Permintaan baru bisa dikirim setelah kontak resmi tersedia.</p></section>
    <section><h2>Menemukan bug atau masalah keamanan?</h2><p>Catat halaman yang bermasalah, langkah yang kamu lakukan, hasil yang seharusnya muncul, dan perangkat atau browser yang dipakai. Jika menyertakan screenshot, tutup email, data login, dan informasi pribadi.</p><p>Jika ada kebocoran data atau celah keamanan, jangan bagikan cara memanfaatkannya atau data yang bocor ke publik. Kontak untuk melapor langsung ke admin masih disiapkan.</p></section>
    <section><h2>Pastikan kontaknya resmi</h2><p>Alamat website yang direncanakan adalah <strong>valrify.app</strong>. Kontak resmi akan ditampilkan di halaman ini. Kontak lain yang belum tercantum belum dipastikan milik admin Valrify.</p><p>Admin tidak meminta password, OTP, recovery code, atau biaya agar laporan ditampilkan. Valrify tidak menjalankan rekber dan tidak meminta deposit transaksi.</p></section>
    <div className="info-actions"><Link className="tactical-button" href="/submit">KIRIM LAPORAN SCAM</Link><Link href="/privasi">Baca kebijakan privasi <span aria-hidden="true">→</span></Link></div>
  </main><Footer/></>;
}
