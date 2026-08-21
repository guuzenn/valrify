# Moderation — Phase 1

Moderator memeriksa apakah bukti mendukung ringkasan publik, bukan menentukan kesalahan hukum. Review mencatat actor, transisi status, waktu, dan rationale.

Saat publish, moderator wajib menulis ringkasan publik yang netral dan bebas data sensitif. Evidence tetap privat. Reject membutuhkan alasan internal. Report published langsung dapat ditemukan melalui identifier yang terhubung.

Moderator/admin tidak dapat memeriksa laporan yang dikirim dari akunnya sendiri. Untuk development, kirim laporan memakai akun tester lalu periksa memakai akun admin.

Konfirmasi transaksi berhasil selalu masuk status `PENDING`. Moderator memeriksa catatan dan bukti opsional, lalu memilih `APPROVED` atau `REJECTED` dengan rationale internal. Moderator tidak boleh meninjau konfirmasi miliknya sendiri. Hanya konfirmasi `APPROVED` yang menjadi metrik dan riwayat publik.
