# Roadmap Rekber Valrify (Ditunda)

## Status dokumen

Dokumen ini menyimpan visi jangka panjang layanan rekber Valrify agar pembahasannya tidak memperlebar scope produk saat ini. Fitur rekber **belum menjadi prioritas implementasi** dan tidak boleh dikerjakan sampai owner memberikan perintah baru secara eksplisit.

Prioritas aktif Valrify tetap menjadi database keamanan transaksi akun Valorant Indonesia: pencarian identifier, scam report, pemeriksaan bukti, moderasi, profil reputasi, edukasi transaksi aman, serta perlindungan dari penipuan pembayaran, rekber palsu, dan hackback.

## Visi akhir

Valrify berkembang dari database keamanan menjadi layanan rekber milik Valrify. Seller yang menggunakan rekber menjalani verifikasi identitas. Data verifikasi dapat membantu moderator membandingkan kecocokan identitas dan identifier dengan laporan yang sudah ada, tanpa membuka dokumen identitas kepada publik.

Rekber direncanakan sebagai fase paling akhir. Valrify tetap eksklusif pada ekosistem transaksi akun Valorant untuk fase produk saat ini, tetapi arsitektur jangka panjang boleh memungkinkan kategori barang digital lain.

## Prinsip yang sudah diputuskan

- Rekber dioperasikan oleh Valrify, bukan direktori rekber bebas.
- Fee berbentuk nominal tetap berdasarkan rentang harga transaksi.
- Seller wajib menjalani verifikasi identitas dan tidak boleh berusia di bawah 18 tahun.
- Pembeli menyelesaikan transaksi melalui konfirmasi `DONE` yang eksplisit.
- Pemeriksaan normal dapat berlangsung beberapa jam, dengan batas maksimum awal 24 jam.
- Transaksi dengan masa hold/garansi dapat memakai periode tujuh hari sesuai kesepakatan awal.
- Refund selalu melalui review, bukan keputusan client-side otomatis.
- Biaya payment gateway/refund menjadi bagian dari perhitungan biaya layanan rekber.
- Payment partner atau Penyedia Jasa Pembayaran berizin menjadi arah penyimpanan dan penerusan dana pada tahap produksi.
- Valrify tidak menyimpan password, OTP, recovery code, cookie, token sesi, atau kredensial akun game.
- Layanan bantuan pengamanan akun, bila dibuat, harus berupa panduan langsung. User tetap mengetik sendiri password dan OTP.

## Alur konseptual

```text
Buyer dan seller membuat transaksi
-> kedua pihak menyetujui detail dan menekan READY
-> buyer membayar invoice
-> seller menyerahkan objek transaksi
-> buyer melakukan pemeriksaan
-> buyer menekan DONE
-> dana dicairkan sesuai aturan transaksi
```

Jika salah satu pihak diam setelah penyerahan dimulai, transaksi masuk antrean review dan tidak boleh langsung di-refund atau dicairkan secara otomatis. Seluruh transisi harus dilakukan server-side dan masuk audit log.

## Tahapan sebelum otomatisasi

1. Seller profile dan verifikasi identitas.
2. Etalase/listing akun untuk seller terverifikasi.
3. Transaction Room privat dengan status, checklist, evidence, dan audit log.
4. Pilot operasional manual tanpa penyimpanan kredensial akun.
5. Aturan dispute, refund, hold, payout, dan kompensasi admin.
6. Integrasi payment partner.
7. Otomatisasi invoice, rekonsiliasi, payout, dan deteksi anomali.

## Aturan sengketa yang harus dirancang sebelum rilis

- Seller tidak menyerahkan akun.
- Akun tidak sesuai listing.
- Buyer diam setelah penyerahan.
- Seller gagal memberikan kode yang diperlukan.
- Hackback selama masa hold.
- Buyer mengubah data akun lalu mengajukan keluhan.
- Salah nominal transfer atau pembayaran terlambat.
- Pembatalan berdasarkan kesepakatan kedua pihak.
- Kesalahan keputusan atau tindakan admin.

Untuk setiap kondisi harus ditentukan bukti minimum, batas waktu, pihak penerima dana, perlakuan fee, hak banding, dan siapa yang berwenang mengambil keputusan.

## Keamanan minimum sebelum menerima identitas atau dana

- Akun admin terpisah dan memakai MFA tahan phishing/passkey.
- Reautentikasi untuk melihat dokumen identitas, refund, dan payout.
- Object storage privat terenkripsi untuk evidence.
- Akses dokumen dan semua keputusan masuk audit log.
- Perubahan rekening payout memiliki notifikasi dan masa tunda.
- Emergency switch untuk membekukan payout.
- Backup terenkripsi dan prosedur restore yang diuji.
- Batas transaksi dan payout harian selama pilot.
- Second approval untuk nominal besar ketika tim operasional sudah bertambah.

## Data identitas dan retensi

KTP dan selfie tidak pernah masuk proyeksi publik. Dokumen mentah tidak disimpan tanpa batas. Sistem harus memiliki tujuan pemrosesan, persetujuan, kontrol akses, jadwal retensi, penghapusan, dan prosedur insiden yang jelas. Setelah verifikasi dan periode sengketa selesai, pertahankan hasil verifikasi serta audit yang diperlukan dan hapus dokumen mentah sesuai kebijakan retensi yang disetujui.

## Hal yang sengaja belum diputuskan

- Rentang harga dan nominal fee.
- Batas nilai transaksi pada pilot.
- Besaran dana yang ditahan selama garansi.
- SLA seller, buyer, admin, refund, dan payout.
- Payment partner yang digunakan.
- Detail KYC serta durasi retensi setiap kategori data.
- Matriks keputusan sengketa final.
- Kebijakan kompensasi jika kesalahan berasal dari Valrify.

Semua keputusan tersebut menunggu riset dan perintah owner pada fase rekber.
