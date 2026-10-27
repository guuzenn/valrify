# Audit keamanan Valrify — 2 Oktober 2026

## Tambahan — Turnstile, 26–27 Oktober 2026

Register, forgot-password, dan resend-verification kini mewajibkan token Turnstile pada endpoint API. Verifikasi melalui Siteverify memiliki timeout 10 detik dan memeriksa success, action endpoint, serta hostname sesuai origin aplikasi. Token kosong, tidak valid, kedaluwarsa/dipakai ulang, konfigurasi secret yang tidak tersedia, dan gangguan provider menolak request sebelum proses akun/email. Widget frontend di-reset setelah submit; rate limit tetap aktif. Login email/Google belum memakai CAPTCHA. Gunakan widget production terpisah dari localhost; site key publik ditanam saat build, secret hanya untuk backend.

Lint/build, 34 unit test, 5 integration test, dan tes browser dengan widget/API tiruan lulus. HTTP smoke memastikan tiga endpoint menolak token kosong dan Siteverify nyata menolak token tidak valid. Owner mengonfirmasi pengujian alur register/verifikasi/login/reset email nyata selesai pada 27 Oktober. Email kontak `support@valrify.app` juga sudah diuji menerima pesan melalui Cloudflare Email Routing dan mengirim balasan melalui Gmail/Brevo. Hosting production belum diuji; catatan audit lama di bawah bersifat historis.

Audit kode, dependency, database lokal, dan akses HTTP. Ini bukan pentest independen atau audit konfigurasi hosting yang sudah terpasang. Tidak ada deployment, commit, atau push dalam pekerjaan ini.

RBAC sudah ada sebelum audit: USER, VERIFIED_MIDDLEMAN, MODERATOR, ADMIN. Controller admin membatasi MODERATOR/ADMIN; akun dan notifikasi menggunakan ID pengguna yang sedang login. Password memakai bcrypt, cookie HttpOnly/SameSite=Lax, token verifikasi/reset di-hash dan sekali pakai, query memakai parameter Drizzle, serta endpoint sensitif memiliki rate limit.

| Prioritas | Temuan sebelum perbaikan | Perubahan |
| --- | --- | --- |
| Critical, sesuai kondisi advisory | Next 16.3.1 memiliki advisory termasuk RCE pada server Windows; Multer, qs, sharp juga memiliki advisory | Next 16.3.8, Multer 2.4.0, qs 6.16.0, sharp 0.35.5; override dependency transitif |
| Tinggi | Role dan status verifikasi dipercaya dari JWT lama | Setiap request terproteksi membaca sesi aktif dan role/status verifikasi terbaru di database |
| Tinggi | Logout hanya menghapus cookie; reset password membiarkan JWT lama aktif | Sesi disimpan di auth_sessions; logout mencabut sesi tersebut, reset password mencabut semua sesi |
| Tinggi | Production bisa memakai secret dan koneksi database demo | Startup menolak secret kosong/pendek/template serta koneksi database bawaan; demo seed dan akun demo diblokir di production |
| Sedang | Upload hanya mempercayai MIME browser | Signature PNG/JPG/WEBP/PDF diperiksa sebelum penyimpanan; batas ukuran, jumlah file, field, dan multipart diterapkan |
| Sedang | Perubahan data belum memeriksa origin secara eksplisit | Origin/Referer harus sesuai allowlist; request cookie tanpa keduanya ditolak; bearer client tanpa origin tetap didukung |
| Sedang | Profil tanpa laporan publik atau testi approved masih dapat dibuka lewat slug | Profil/pencarian exact dibatasi; testi tidak dapat membuat profil privat menjadi publik |
| Sedang | Request moderasi bersamaan dapat menimpa keputusan | Row lock dan pemeriksaan ulang status dalam transaction |
| Sedang | Header keamanan belum konsisten; bukti publik dapat tersimpan di cache selama satu jam | nosniff, anti-framing, no-referrer, CSP dasar; bukti no-store + sandbox; PDF privat sebagai attachment; filename respons tetap |
| Sedang | Metadata memakai forwarded host dari request | URL metadata menggunakan PUBLIC_APP_URL atau origin tetap |
| Sedang | Password baru hingga 128 karakter dapat terpotong oleh bcrypt | Register/reset/admin bootstrap dibatasi 72 byte UTF-8; login lama tetap kompatibel |
| Alat pengembangan | Advisory pada esbuild, fast-uri, js-yaml, brace-expansion | Patch transitif dengan versi kompatibel diterapkan dan tool migrasi diuji ulang |

Advisory dependency menunjukkan versi yang terdampak, bukan bukti bahwa seluruh exploit telah direproduksi pada Valrify. Advisory Next Windows yang diperiksa: [GHSA-p293-qw3h-jr36](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36).

Dashboard tetap `/admin/reports` dan `/admin/community`, dengan layout/navigasi admin terpisah. Server memeriksa sesi sebelum membuka layout; API tetap memeriksa role pada setiap request. Memindahkan alamat dashboard ke subdomain saja tidak menambah otorisasi.

Di `/account` tersedia daftar sesi milik sendiri dan tombol mengakhirinya. Sesi admin/moderator berlaku maksimal dua jam; pengguna lain tujuh hari. Sesi lama dari implementasi JWT sebelumnya tidak diterima lagi dan pengguna perlu login ulang. Sesi admin yang berasal dari akun yang baru dipromosikan juga dibatasi dua jam dari awal sesi.

Migrasi `apps/api/drizzle/0012_conscious_wolf_cub.sql` sudah diterapkan di database lokal. Jalankan `pnpm db:migrate` pada database deployment sebelum menjalankan API versi ini.

Hasil verifikasi:

- `pnpm build` dan `pnpm lint` lulus.
- `pnpm test`: 31 test lulus.
- `pnpm test:integration`: 2 test lulus dengan database lokal; fixture dibersihkan.
- 16 pemeriksaan HTTP lulus: API admin 401 tanpa sesi, 403 untuk USER, bukti privat 403 untuk USER, admin valid 200, layout admin redirect login/account, sesi antar akun tidak dapat dicabut, foreign-origin logout ditolak, perubahan role langsung menghilangkan akses admin, logout membuat cookie lama ditolak.
- `pnpm audit --prod`: dari 11 advisory menjadi 0.
- `pnpm audit` setelah patch alat pengembangan: 0 advisory pada 519 dependency yang diperiksa. Ini adalah hasil database advisory pada tanggal audit, bukan jaminan bebas vulnerability.
- `pnpm db:generate` setelah patch tooling tidak menemukan perubahan schema tambahan.

Persiapan deployment yang masih harus dilakukan:

1. HTTPS untuk valrify.app; set WEB_ORIGIN dan PUBLIC_APP_URL ke origin HTTPS yang sebenarnya, AUTH_SECRET acak unik, DATABASE_URL non-demo. API/DB tidak boleh terbuka lewat port yang melewati reverse proxy atau access gateway.
2. Brevo dan EMAIL_FROM aktif. API production memang menolak startup tanpa konfigurasi email; konfigurasi lokal belum berarti pengiriman production sudah berhasil.
3. Pakai database production tanpa data/akun demo. Untuk admin pertama, isi VALRIFY_BOOTSTRAP_ADMIN_EMAIL, VALRIFY_BOOTSTRAP_ADMIN_PASSWORD, dan VALRIFY_BOOTSTRAP_ADMIN_NAME melalui environment privat, lalu jalankan `pnpm --filter @valrify/api admin:create`. Script hanya membuat akun baru, tidak mempromosikan akun yang sudah ada, dan menandai email admin hasil bootstrap sebagai terverifikasi. Pastikan alamat itu benar-benar milik admin. Hapus environment password bootstrap setelah selesai.
4. MFA admin belum dibuat. Sebelum beta publik, gunakan MFA aplikasi atau access gateway dengan MFA yang melindungi `/admin/*` dan `/api/admin/*`; bila memakai gateway, cegah akses langsung ke origin. Sesi dua jam tidak menggantikan MFA.
5. Pastikan bucket R2 privat, credential hanya di server, backup database/bukti berjalan dan restore diuji. TLS, firewall, IAM, WAF, backup, dan konfigurasi hosting belum diverifikasi pada audit lokal ini.
6. Tentukan mekanisme koreksi/takedown laporan yang sudah PUBLISHED dan kontak admin yang aktif. UI penghapusan/koreksi laporan publik dan akun belum tersedia; status review saat ini tidak menerima laporan yang sudah PUBLISHED.

Batas yang masih ada: rate limit memakai memori per proses, sehingga restart menghapus counter dan beberapa instance membutuhkan storage bersama/limit di proxy. Upload signature bukan pemindaian malware atau validasi isi menyeluruh; PDF tidak dipublikasikan dan gambar tetap perlu diperiksa admin. CSP baru membatasi framing/object/base URI, belum menerapkan kebijakan script dengan nonce/hash. Pembersihan sesi kedaluwarsa dilakukan ketika akun login lagi; job pembersihan bisa ditambahkan bila akun dorman menumpuk. File storage yang terlanjur tertulis ketika transaction gagal belum memiliki cleanup otomatis. Moderation log tersimpan di database tetapi belum berupa log eksternal yang tahan perubahan admin database.

Acuan sesi dan otorisasi: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

Kode kini memiliki proteksi dasar yang lebih kuat untuk pengujian beta terbatas. Kesiapan beta publik masih bergantung pada verifikasi deployment, pengamanan admin, email, dan proses koreksi data di atas.

## Verifikasi ulang — 12 Oktober 2026

Audit terbaru menemukan dua advisory tambahan yang tidak tercakup hasil 2 Oktober:

- `proxy-addr` 2.0.7 (critical, GHSA-jqcg-44mw-7w3h): dipatch ke 2.0.8. Advisory memerlukan konfigurasi trust subnet IPv6 tertentu; Valrify menggunakan jumlah hop, sehingga kondisi pemicu tersebut tidak ditemukan pada konfigurasi kode saat ini. Konfigurasi reverse proxy deployment tetap harus diperiksa.
- `source-map-js` 1.2.1 (high, GHSA-68fv-2mgg-jv7q): dipatch ke 1.2.2. Tidak ditemukan endpoint aplikasi yang menerima source map dari pengguna.

Kedua versi dikunci melalui override pnpm dan lockfile. Next lokal tetap 16.3.8, termasuk patch RCE Windows sebelumnya. Migration `0012_conscious_wolf_cub.sql` wajib diterapkan sebelum API ini dijalankan pada deployment; pengguna dengan cookie JWT lama perlu login kembali.

Verifikasi setelah patch: `pnpm audit --json` tidak menemukan advisory pada 519 dependency; 31 unit test dan 2 integration test lulus; lint TypeScript, build seluruh workspace, dan pemeriksaan diff lulus. Integration test menggunakan database lokal dan membersihkan fixture. Ini bukan pentest atau pengujian konfigurasi production.

Bagian ini mencatat patch kode/dependency, bukan persetujuan rilis publik. MFA admin, kontak koreksi/takedown aktif, backup/restore, dan konfigurasi hosting production masih harus diselesaikan dan diverifikasi.

### Penarikan laporan dan backup lokal — 12 Oktober 2026

Penarikan laporan `PUBLISHED` kini tersedia pada tab **SUDAH TAMPIL** di panel admin. API tetap dilindungi role moderator/admin, melarang self-review, memvalidasi alasan, dan mengunci baris sebelum mengubah status menjadi `WITHDRAWN`. Status history dan moderation action ditulis dalam transaksi yang sama dengan pencabutan approval bukti publik. Tidak ada penghapusan bukti atau data sumber. Penarikan belum dapat dibatalkan lewat panel.

Proyeksi publik menyembunyikan identifier laporan yang ditarik kecuali masih didukung laporan `PUBLISHED` lain pada entity yang sama. Kasus/bukti publik, daftar laporan, dan hitungan risiko mengikuti status terbaru. Profil dengan testi approved tetap tersedia tanpa identifier yang hanya didukung laporan withdrawn. Alasan penarikan tersedia secara privat untuk pelapor.

`pnpm db:backup` membuat arsip custom PostgreSQL lokal dengan snapshot konsisten, checksum SHA-256, jumlah baris dan fingerprint isi setiap tabel public/drizzle. `pnpm db:restore:test <file.dump>` hanya membuat database sementara bernama acak, memeriksa kesamaan tabel hasil restore, lalu membersihkannya. Verifikasi nyata berhasil pada 22 tabel. Backup di `.data/backups/` diabaikan Git dan hanya mencakup database; evidence dan salinan di luar perangkat masih perlu ditangani terpisah.

Kontak resmi, MFA, penjadwalan backup, backup evidence, dan verifikasi hosting production masih belum selesai. Penarikan oleh admin bukan pengganti kanal koreksi pengguna yang aktif.
