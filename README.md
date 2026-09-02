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
| `pnpm db:up` | Menjalankan PostgreSQL melalui Docker |
| `pnpm db:down` | Menghentikan layanan Docker |
| `pnpm db:generate` | Membuat migration database |
| `pnpm db:migrate` | Menerapkan migration database |
| `pnpm db:seed` | Mengisi data demonstrasi |

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
