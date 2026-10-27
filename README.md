# Valrify

**Platform reputasi komunitas untuk transaksi akun Valorant di Indonesia.**

Valrify membantu komunitas memeriksa jejak penjual atau pembeli sebelum bertransaksi. Pengguna dapat mencari identitas yang pernah dilaporkan, membaca laporan yang sudah ditinjau, membagikan pengalaman transaksi, dan berdiskusi tentang praktik transaksi yang lebih aman.

> [!IMPORTANT]
> Valrify menampilkan laporan, bukti, dan sinyal dari komunitas. Informasi di platform bukan putusan hukum dan tidak menjamin sebuah transaksi pasti aman.

## Mengapa Valrify dibuat

Riwayat transaksi sering tersebar di chat, unggahan media sosial, dan grup komunitas. Akibatnya, informasi penting sulit ditemukan saat paling dibutuhkan. Valrify menyatukan informasi tersebut dalam profil yang dapat dicari dan menyajikannya dengan konteks yang lebih jelas.

Prinsip utama Valrify:

* **Berbasis bukti.** Laporan tidak langsung tampil kepada publik. Admin memeriksa data dan bukti pendukung terlebih dahulu.
* **Netral dan kontekstual.** Platform menyajikan informasi yang tersedia tanpa menetapkan seseorang bersalah secara hukum.
* **Menjaga privasi.** Data sensitif, bukti mentah, dan identitas pelapor tidak ditampilkan secara terbuka.
* **Dibangun untuk komunitas.** Pengguna dapat berbagi pengalaman, tips, dan reputasi transaksi positif.

## Fitur utama

* Pencarian profil berdasarkan nama, Riot ID, username, nomor telepon, rekening, dan identitas terkait lainnya
* Laporan transaksi dengan unggahan bukti dan alur pemeriksaan admin
* Halaman profil yang merangkum laporan serta testi transaksi
* Akun pengguna dengan verifikasi email, riwayat kiriman, dan notifikasi
* Community feed untuk berbagi pengalaman dan tips transaksi
* Moderasi konten, kontrol akses berbasis peran, dan pencatatan keputusan admin
* Penyimpanan bukti secara lokal untuk development atau melalui bucket private Cloudflare R2
* Rate limiting untuk endpoint autentikasi, pencarian, unggahan, dan pengiriman laporan

## Status proyek

Valrify sedang berada dalam tahap beta aktif. Alur utama pencarian, laporan, pemeriksaan admin, profil reputasi, testi transaksi, autentikasi, dan komunitas sudah tersedia. Masukan, pengujian, serta kontribusi dari komunitas sangat diterima.

Data yang dibuat melalui proses seed sepenuhnya fiktif dan hanya digunakan untuk demonstrasi.

## Teknologi

| Bagian | Teknologi |
| --- | --- |
| Web | Next.js, React, Tailwind CSS |
| API | NestJS, Zod |
| Database | PostgreSQL, Drizzle ORM |
| Penyimpanan bukti | Local storage, Cloudflare R2 |
| Monorepo | pnpm workspaces, TypeScript |

## Menjalankan secara lokal

### Prasyarat

* Node.js 22.13 atau versi yang lebih baru
* pnpm 11
* Docker Desktop atau Docker Engine dengan Compose

### Instalasi

```powershell
Copy-Item .env.example .env
pnpm install
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Setelah aplikasi berjalan:

* Web tersedia di `http://localhost:3000`
* API tersedia di `http://localhost:3001/api`
* Health check tersedia di `http://localhost:3001/api/health`

Konfigurasi bawaan ditujukan untuk development lokal. Sebelum deployment publik, ganti `AUTH_SECRET`, konfigurasi email, kredensial database, dan pengaturan penyimpanan dengan nilai yang aman.

### Turnstile

Register, lupa password, dan kirim ulang verifikasi membutuhkan Turnstile. Isi `NEXT_PUBLIC_TURNSTILE_SITE_KEY` dan `TURNSTILE_SECRET_KEY` di `.env` root, lalu restart web/API. Web memuat environment root melalui `next.config.ts`; site key publik ditanam saat build, jadi build ulang jika key berubah. Secret hanya dibaca API.

Gunakan widget development dengan hostname `localhost`, dan widget production terpisah dengan hostname domain yang sama dengan `WEB_ORIGIN`/`PUBLIC_APP_URL`. Backend memvalidasi token sekali pakai, action, dan hostname melalui Siteverify; kegagalan verifikasi atau gangguan layanan menolak request. Widget di-reset setelah submit agar token tidak dipakai ulang. Login email/Google tidak memakai CAPTCHA pada tahap ini; rate limit tetap aktif.

### Login Google

Pendaftaran email di `/register` meminta username unik 3–24 karakter (huruf, angka, underscore), dinormalisasi lowercase. Username digunakan untuk profil `/u/username` dan mengikuti cooldown perubahan tujuh hari. Login tetap memakai email/password. Akun Google memilih username lewat pengaturan akun.

Isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan `PUBLIC_APP_URL` pada environment API. Daftarkan `${PUBLIC_APP_URL}/api/auth/google/callback` sebagai Authorized redirect URI di Google Console (lokal: `http://localhost:3000/api/auth/google/callback`, tanpa slash terakhir). Jalankan `pnpm db:migrate`, lalu restart API. Tombol **Lanjutkan dengan Google** tersedia di `/login`. Alur hanya meminta identitas dasar (`openid email profile`); token Google tidak disimpan.

Akun Google baru mendapat role USER dan memakai ID Google sebagai identitas tetap. Email Google harus terverifikasi. Email yang sudah terdaftar pada akun lain tidak ditautkan otomatis; gunakan login password untuk akun tersebut. Penautan akun belum tersedia. Gunakan client Google terpisah untuk production dengan callback HTTPS yang sesuai domain.

### CI/CD dan paket VPS

Workflow **CI and production deploy** memeriksa lint, unit test, integration test PostgreSQL, build, serta paket aplikasi pada push atau pull request ke `main`. Workflow juga dapat dijalankan manual. Lihat [panduan deployment](DEPLOYMENT.md) untuk setup VPS/GitHub sekali dan prosedur rollback.

Build memakai Ubuntu 24.04 x64, Node.js 24, dan repository variable publik `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Secret backend tetap di VPS. Job deploy terpisah memakai tiga environment secrets pada `production`: `DEPLOY_HOST`, `DEPLOY_SSH_KEY`, dan `DEPLOY_KNOWN_HOSTS`. Deploy hanya berjalan dari `main` setelah seluruh pemeriksaan berhasil dan repository variable `DEPLOY_ENABLED=true` dipasang. Biarkan flag nonaktif sampai setup VPS selesai.

Artifact `valrify-web-linux-x64` tersedia selama tujuh hari dan memuat paket web standalone serta paket gabungan API/web, masing-masing dengan checksum SHA-256. Paket menyertakan runtime dependencies, aset, migration SQL dan `REVISION`, tanpa `.env`. Deploy mengirim paket gabungan lewat SSH, memverifikasi checksum, membuat backup database, menerapkan migrasi, mengganti symlink `current`, dan me-restart layanan systemd. Health check gagal memicu rollback aplikasi; database tidak dibatalkan otomatis. Paket web terpisah tetap tersedia untuk pemasangan manual sesuai panduan deployment.

### Login admin dan MFA

Admin/moderator memakai password dan authenticator TOTP melalui `/<ADMIN_LOGIN_SLUG>`. Atur `ADMIN_LOGIN_SLUG=mgmt-<hasil openssl rand -hex 12>` pada runtime web **dan** API dengan nilai yang sama, tanpa slash. Slug tidak ditanam saat build dan tidak ditautkan dari halaman publik. Path yang salah menghasilkan 404. Halaman panel tetap `/admin/*`; API tetap `/api/admin/*`. Akses panel tanpa sesi yang sah menghasilkan 404, sedangkan API tetap memeriksa role. Alamat tersembunyi bukan pengganti otorisasi.

Pada API, isi `MFA_ENCRYPTION_KEY` dengan hasil `openssl rand -hex 32`, terpisah dari `AUTH_SECRET`. Simpan key ini dalam backup privat: key diperlukan untuk membuka secret authenticator terenkripsi dalam backup database. Jangan menggantinya tanpa prosedur migrasi enkripsi. Pastikan jam server tersinkron agar TOTP valid. Jalankan `pnpm db:migrate` (termasuk `0014_shallow_wendell_vaughn.sql`) sebelum menjalankan API versi ini. Sesi admin lama tanpa verifikasi MFA akan ditolak; sesi pengguna biasa tetap mengikuti aturan sebelumnya.

Login pertama melalui URL khusus memerlukan password akun admin yang emailnya sudah terverifikasi, lalu pemasangan authenticator dan pembuktian kode enam digit. QR dibuat di server tanpa layanan eksternal. Setelah aktif, delapan recovery code ditampilkan sekali; simpan di password manager. Login berikutnya memerlukan password dan kode authenticator baru. Login publik/password dan Google tidak menerbitkan sesi untuk admin/moderator. Akun admin pertama dibuat dengan perintah `admin:create` yang dijelaskan pada audit keamanan; script hanya membuat email baru, bukan mempromosikan akun pengguna yang ada.

Jika HP hilang, masuk melalui URL khusus dengan password lalu pilih **Gunakan recovery code**. Satu recovery code hanya bisa dipakai sekali dan mewajibkan pemasangan authenticator baru sebelum masuk panel. Proses ini mencabut sesi lama; setelah pemasangan selesai semua recovery code lama diganti. Reset password mencabut sesi/challenge login tetapi tidak mematikan MFA. Jika authenticator dan seluruh recovery code hilang, pemulihan memerlukan operator server dengan pemeriksaan kepemilikan; tidak ada tombol reset MFA publik. Challenge password berlaku lima menit, dengan maksimal lima percobaan MFA per akun dalam challenge yang belum kedaluwarsa.

Pada deployment yang masih memblokir admin di Nginx, pertahankan blokir hingga API/web diperbarui dan login MFA diuji. Sesudahnya ganti blok `return 403` sementara dengan penerusan ke layanan yang sudah memeriksa sesi/MFA; jangan membuka port aplikasi/database ke publik. Cloudflare Access tidak diperlukan oleh alur ini.

### Akun demo

| Peran | Email | Password |
| --- | --- | --- |
| Admin | `admin@valrify.local` | `DemoPass!2026` |
| Pengguna | `tester@valrify.local` | `DemoPass!2026` |

Gunakan akun pengguna untuk mengirim laporan atau testi, kemudian gunakan akun admin untuk mencoba alur pemeriksaan. Contoh kata kunci pencarian tersedia melalui data seed, seperti `ArkaNusa Demo`, `arkanusa.demo`, dan `ArkaDemo#VALRIFY`.

## Perintah pengembangan

| Perintah | Fungsi |
| --- | --- |
| `pnpm dev` | Menjalankan web dan API |
| `pnpm build` | Membuat build seluruh workspace |
| `pnpm lint` | Memeriksa TypeScript |
| `pnpm test` | Menjalankan unit test |
| `pnpm test:integration` | Menguji pencarian publik terhadap PostgreSQL lokal |
| `pnpm db:up` | Menjalankan PostgreSQL melalui Docker |
| `pnpm db:down` | Menghentikan layanan Docker |
| `pnpm db:generate` | Membuat migration database |
| `pnpm db:migrate` | Menerapkan migration database |
| `pnpm db:seed` | Mengisi data demonstrasi |
| `pnpm db:backup` | Membuat backup PostgreSQL Docker lokal beserta checksum dan fingerprint tabel |
| `pnpm db:restore:test <file.dump>` | Menguji restore backup ke database sementara tanpa menimpa database sumber |

Backup lokal disimpan di `.data/backups/` dan tidak masuk Git. Jalankan `pnpm db:up` terlebih dahulu. Setelah `pnpm db:backup`, gunakan perintah verifikasi yang dicetak untuk memeriksa bahwa seluruh isi tabel hasil restore sama dengan snapshot backup. Database sementara otomatis dibersihkan. Simpan arsip `.dump` dan pasangan `.dump.json` bersama di lokasi privat; keduanya diperlukan untuk verifikasi.

Perintah ini khusus database development pada Docker Compose lokal, tidak membaca `DATABASE_URL` production. Backup hanya mencakup database dan metadata bukti; file evidence lokal/R2 perlu backup terpisah. Salinan di disk yang sama belum melindungi dari kerusakan perangkat.

### Menarik laporan publik

Di `/admin/reports`, buka tab **SUDAH TAMPIL**, pilih laporan, lalu **TARIK LAPORAN**. Alasan minimal 10 karakter dan konfirmasi kedua wajib diisi. Moderator/admin tidak dapat menarik kirimannya sendiri. Laporan berubah menjadi `WITHDRAWN`; halaman kasus dan bukti publik tidak dapat dibuka, identifier tanpa dukungan laporan published lain disembunyikan, dan hitungan laporan diperbarui. Data sumber, bukti privat, serta alasan penarikan tetap tersimpan untuk audit. Pelapor dapat melihat alasan di Akun Saya. Panel belum menyediakan pembatalan penarikan atau publikasi ulang.

## Struktur repositori

```text
apps/
  web/          aplikasi Next.js
  api/          REST API NestJS
packages/
  domain/       aturan domain, normalisasi, dan kontrol akses
  validation/   skema validasi bersama
db/             aset database
tests/          pengujian lintas aplikasi
```

## Berkontribusi

Kontribusi dapat berupa laporan bug, usulan fitur, perbaikan dokumentasi, desain, maupun kode. Sebelum mengirim perubahan besar, buka diskusi atau issue terlebih dahulu agar kebutuhan dan ruang lingkupnya dapat disepakati bersama.

Saat mengirim perubahan kode, pastikan pemeriksaan berikut berhasil:

```powershell
pnpm lint
pnpm test
pnpm build
```

Mohon jangan memasukkan data transaksi nyata, data pribadi, token, kredensial, atau bukti sensitif ke dalam issue, commit, maupun data pengujian.

## Keamanan dan privasi

Jika menemukan kerentanan keamanan atau potensi kebocoran data, jangan publikasikan detail eksploitasi melalui issue terbuka. Hubungi pengelola proyek melalui kanal privat yang tersedia pada profil pemilik repositori.

Valrify adalah proyek komunitas independen dan tidak berafiliasi dengan Riot Games. VALORANT dan Riot Games merupakan merek dagang milik pemiliknya masing-masing.
