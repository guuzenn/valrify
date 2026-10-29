import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: "Ketentuan Penggunaan",
  description: "Aturan penggunaan Valrify, pengiriman laporan, serta batas informasi keamanan transaksi.",
};

export default function TermsPage() {
  return <><Header compact backLabel="Kembali ke beranda"/><main className="page shell narrow info-page">
    <div className="info-hero"><p className="section-label eyebrow">// INFORMASI BETA</p>
    <h1 className="page-title">ATURAN PAKAI.</h1>
    <p className="page-intro">Valrify membantu kamu memeriksa riwayat transaksi akun Valorant melalui laporan komunitas.</p>
    <p className="info-updated">Diperbarui 28 Oktober 2026 · Berlaku untuk penggunaan beta Valrify.</p></div>

    <nav className="reading-toc" aria-label="Isi halaman"><strong>Di halaman ini</strong><a href="#bagian-1">Pahami informasi yang kamu lihat</a><a href="#bagian-2">Kirim laporan yang dapat diperiksa</a><a href="#bagian-3">Nomor, akun, dan bukti yang ditampilkan</a><a href="#bagian-4">Jaga akunmu</a><a href="#bagian-5">Tetap periksa sebelum transaksi</a></nav><section id="bagian-1"><h2>Pahami informasi yang kamu lihat</h2><p>Admin dan moderator memeriksa laporan dari cerita dan bukti yang dikirim. Rekber terverifikasi dapat menerbitkan laporannya sendiri dengan ringkasan dan bukti publik. Laporan yang muncul bukan putusan hukum. Jika pencarian kosong, artinya belum ada data yang cocok di Valrify, bukan berarti transaksi pasti aman.</p><p>Beta ini belum punya fitur AI untuk menilai risiko chat. Informasi di Valrify tidak menjamin seseorang, akun, atau transaksi pasti aman.</p></section>
    <section id="bagian-2"><h2>Kirim laporan yang dapat diperiksa</h2><ul><li>Jelaskan kejadian dengan jujur dan pisahkan fakta yang kamu alami dari dugaan.</li><li>Sertakan nomor atau akun yang benar-benar terkait serta bukti yang relevan.</li><li>Jangan memalsukan bukti, menyamar sebagai pihak lain, atau memakai laporan untuk mengancam dan melecehkan.</li><li>Jangan mengirim password, OTP, token, recovery code, atau data pribadi yang tidak diperlukan.</li></ul><p>Kejadian lama tetap boleh dilaporkan. Admin dapat meminta informasi tambahan, menolak laporan yang tidak cukup didukung bukti, dan menentukan ringkasan serta gambar yang boleh tampil.</p></section>
    <section id="bagian-3"><h2>Nomor, akun, dan bukti yang ditampilkan</h2><p>Nomor dan akun yang dilaporkan bisa tampil lengkap setelah laporan disetujui. Link posting bukti dan gambar yang dipilih penerbit laporan juga bisa dilihat orang lain. Baca <Link href="/privasi">halaman Privasi</Link> sebelum mengirim.</p><p>Data bisa salah dan nomor atau akun bisa berganti pemilik. Jika ada kesalahan, siapkan link laporan dan jelaskan bagian yang perlu diperbaiki. Informasi kontak tersedia di <Link href="/kontak">halaman Kontak & koreksi</Link>.</p></section>
    <section id="bagian-4"><h2>Jaga akunmu</h2><p>Gunakan email milikmu, password yang tidak dipakai di tempat lain, dan logout setelah memakai perangkat bersama. Jangan membagikan akses admin, membuka bukti tanpa izin, mengirim spam, atau mengakali batas request.</p><p>Selama beta, laporan pengguna biasa diperiksa oleh satu admin; rekber terverifikasi bertanggung jawab atas publikasi kirimannya sendiri. Waktu pemeriksaan belum bisa dipastikan. Aplikasi juga bisa mengalami gangguan atau perubahan.</p></section>
    <section id="bagian-5"><h2>Tetap periksa sebelum transaksi</h2><p>Valrify bukan layanan rekber, tidak menerima atau menahan uang transaksi, dan tidak menyimpan data login akun game. Tetap cek sendiri dan baca <Link href="/cara-aman">panduan Cara Amanin</Link>.</p><p>Valrify adalah proyek komunitas dan tidak bekerja sama dengan Riot Games. Aturan platform tetap berlaku. Panduan Valrify bukan izin dari platform untuk jual beli akun.</p></section>
    <aside className="info-notice"><strong>Aturan bisa diperbarui</strong><p>Aturan ini bisa berubah selama beta. Cek tanggal pembaruan di halaman ini untuk mengetahui kapan isinya terakhir diubah.</p></aside>
  </main><Footer/></>;
}
