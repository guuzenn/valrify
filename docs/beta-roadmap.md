# Roadmap Beta Valrify

Roadmap ini menjaga fokus Valrify pada database keamanan sebelum fitur partner rekber atau rekber otomatis dibuka.

## Sprint 1 — Laporan yang ringkas dan terstruktur

Status: selesai di working tree, menunggu persetujuan owner.

- Ganti konteks transaksi lama dengan kategori masalah: penipuan pembayaran, rekber palsu, hackback, data akun tidak sesuai, dan lainnya.
- Hapus judul manual; server membuat judul publik yang netral dari kategori.
- Hapus nominal kerugian dari seluruh alur scam report.
- Gunakan empat langkah yang jelas: kategori, orang/akun, cerita, dan bukti.
- Tampilkan kategori pada antrean admin dan detail laporan publik.
- Pertahankan label yang dapat dibaca untuk laporan lama tanpa migrasi destruktif.

## Sprint 2 — Hasil pencarian yang memberi keputusan jelas

- Bedakan hasil `ada laporan`, `belum ada data`, dan `input tidak valid`.
- Tegaskan bahwa belum ada data bukan berarti aman.
- Berikan langkah lanjutan yang sesuai untuk setiap kondisi.
- Audit pencarian dan halaman profil pada tampilan HP.

## Sprint 3 — Fondasi production

- Hubungkan email verifikasi dan pemulihan akun ke provider production.
- Pindahkan evidence ke object storage.
- Tambahkan rate limit, backup, observability, serta halaman Privasi, Ketentuan, dan Kontak.
- Jalankan integration test database untuk alur laporan dan pemeriksaan admin.

## Sprint 4 — Analytics dan rilis beta

- Catat jumlah pengunjung, pencarian, laporan terkirim, kunjungan Cara Aman, dan detail kasus tanpa merekam query sensitif mentah.
- Siapkan data awal dari laporan yang memiliki bukti dan dapat diperiksa.
- Rilis beta, pantau error, dan ukur penggunaan selama periode awal.

## Setelah beta

Tab Rekber Rekomendasi belum ditampilkan. Tab tersebut baru dibuka ketika Valrify sudah memiliki traffic dan partner rekber pertama telah lolos pemeriksaan serta membayar biaya bulanan. Tidak ada daftar rekomendasi rekber gratis.
