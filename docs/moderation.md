# Moderation — Phase 1

Moderator memeriksa apakah bukti mendukung ringkasan publik, bukan menentukan kesalahan hukum. Review mencatat actor, transisi status, waktu, dan rationale.

Saat publish, moderator wajib menulis ringkasan publik yang netral dan bebas data sensitif. Evidence tetap privat. Reject membutuhkan alasan internal. Report published langsung dapat ditemukan melalui identifier yang terhubung.

Moderator/admin tidak dapat memeriksa laporan yang dikirim dari akunnya sendiri. Untuk development, kirim laporan memakai akun tester lalu periksa memakai akun admin.

Saat menerbitkan scam report, moderator harus memastikan tersedia minimal satu bukti publik: link posting bukti atau gambar yang dipilih secara eksplisit. Hanya gambar yang telah diperiksa bebas dari data korban, OTP, dokumen identitas, dan informasi pihak lain yang boleh ditandai publik. Upload lain tetap privat. Bukti publik dapat dicabut dengan mengubah approval tanpa menghapus laporan.

Konfirmasi transaksi berhasil selalu masuk status `PENDING`. Moderator memeriksa catatan dan bukti opsional, lalu memilih `APPROVED` atau `REJECTED` dengan rationale internal. Moderator tidak boleh meninjau konfirmasi miliknya sendiri. Hanya konfirmasi `APPROVED` yang menjadi metrik dan riwayat publik.

## Admin Panel v1

- Dashboard menampilkan antrean aktif, jumlah published/approved, jumlah rejected, dan keputusan dalam 24 jam terakhir.
- Queue dapat dicari berdasarkan ID laporan, nama seller, pengirim, atau identifier dan dapat difilter berdasarkan status laporan.
- Detail antrean ditutup secara default agar moderator dapat memindai daftar sebelum membuka satu kasus.
- Gambar bukti privat dapat dipreview dalam modal. File non-gambar dan link posting dibuka secara eksplisit.
- Publish/reject membutuhkan konfirmasi kedua setelah form tervalidasi untuk mengurangi salah klik.
- Aktivitas terbaru adalah ringkasan operasional; tabel `moderation_actions` tetap menjadi audit record utama.
