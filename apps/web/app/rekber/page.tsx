import { ArrowIcon } from "../components/ArrowIcon";
import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: "Rekomendasi Rekber",
  description: "Valrify belum berafiliasi dengan rekber mana pun. Kenali cara memeriksa kontak rekber dan waspadai rekomendasi yang mencurigakan sebelum transaksi.",
};

export default function MiddlemanPage() {
  return <><Header compact backLabel="Kembali ke beranda"/><main className="page shell narrow info-page">
    <div className="info-hero"><p className="eyebrow">// REKOMENDASI REKBER</p>
      <h1 className="page-title">KENALI REKBERNYA.<br/>JANGAN ASAL PERCAYA.</h1>
      <p className="page-intro">Rekber membantu menahan dana selama proses transaksi. Sebelum memilih, pastikan siapa yang kamu hubungi dan jangan terburu-buru mengirim uang.</p>
    </div>
    <aside className="info-notice"><strong>Valrify belum berafiliasi dengan rekber mana pun.</strong><p>Saat ini belum ada rekber yang menjadi partner atau direkomendasikan secara resmi oleh Valrify. Jika ada pihak yang mengatasnamakan Valrify untuk menawarkan jasa rekber, jangan langsung percaya. Tetap hati-hati dan periksa secara mandiri.</p></aside>

    <section><h2>Pastikan kamu menghubungi rekber yang asli.</h2><p>Cari profil dan kontak resmi rekber secara mandiri dari kanal yang riwayatnya bisa diperiksa. Cocokkan link profil, username, nomor telepon, dan rekening tujuan. Nama serta foto profil yang sama belum membuktikan akun itu asli.</p><p>Hubungi kontak resmi tersebut untuk mengonfirmasi akun yang masuk ke grup transaksi dan rekening pembayarannya. Jangan hanya mengandalkan link, nomor alternatif, screenshot chat, atau testimoni yang dikirim lawan transaksi.</p></section>
    <section><h2>Belum kenal rekbernya? Tanya komunitas dulu.</h2><p>Kalau kamu diajak memakai rekber yang belum kamu kenal, tunda transaksi dan coba buat posting di grup komunitas Facebook yang kamu ikuti. Sertakan link profil rekber yang ingin dicek, lalu minta pengalaman anggota lain atau bantuan admin untuk mencocokkan kontaknya.</p><p>Periksa riwayat posting dan jawaban dari beberapa anggota yang berbeda. Komentar positif atau banyaknya rekomendasi belum menjamin keaslian rekber. Jangan unggah password, OTP, dokumen identitas, atau bukti transfer yang masih memuat data pribadi.</p></section>
    <section><h2>Waspadai DM yang mendesakmu memilih satu rekber.</h2><p>Berhati-hatilah jika orang yang tiba-tiba menghubungimu lewat DM atau PM menawarkan rekber tertentu, lalu terus mengarahkan atau memaksa transaksi ke sana. Rekomendasi dari orang yang belum kamu kenal tetap perlu diperiksa, meski ia mengaku pernah bertransaksi atau mengenal admin.</p><p>Jika lawan transaksi menolak semua pilihan lain, melarangmu bertanya di grup, atau memberi tekanan agar segera transfer, berhenti dulu. Pilih rekber yang sama-sama disetujui setelah kedua pihak punya waktu untuk memeriksanya.</p></section>
    <section><h2>Periksa setiap nama dalam daftar rekomendasi.</h2><p>Daftar yang memuat beberapa rekber tepercaya tidak otomatis membuat semua nama di dalamnya tepercaya. Satu akun palsu atau rekber yang belum jelas bisa disisipkan di antara nama-nama yang sudah dikenal agar ikut terlihat meyakinkan.</p><p>Cek setiap nama, link profil, dan kontak satu per satu. Jangan menganggap sebuah akun asli hanya karena namanya mirip atau tercantum bersebelahan dengan rekber yang kamu kenal.</p></section>
    <section><h2>Sebelum transfer, cocokkan sekali lagi.</h2><ul>
      <li>Pastikan akun rekber di grup sama dengan akun yang kamu hubungi melalui kontak resmi.</li>
      <li>Sepakati harga, fee, dan alur transaksi sebelum mengirim dana.</li>
      <li>Jangan lanjutkan jika diminta deposit, jaminan uang yang katanya akan dikembalikan, atau top up tambahan di luar harga dan fee yang disepakati.</li>
      <li>Dana baru dicairkan setelah pembeli selesai memeriksa dan mengamankan akun, lalu memberikan konfirmasi.</li>
    </ul><p>Cari juga nomor atau akun terkait di Valrify. Hasil tanpa laporan berarti belum ada data yang ditemukan, bukan jaminan rekber atau transaksi tersebut aman.</p></section>
    <div className="info-actions"><Link className="tactical-button" href="/search">CEK DATA DI VALRIFY <ArrowIcon/></Link><Link href="/cara-aman">Baca panduan transaksi <span aria-hidden="true"><ArrowIcon direction="right"/></span></Link></div>
  </main><Footer/></>;
}
