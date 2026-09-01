# Konteks Implementasi

## Keputusan 21 Agustus 2026

- Master spec Valrify adalah product source of truth.
- Implementasi dibatasi pada Phase 1 dan vertical slice minimum.
- Desain publik yang sudah disetujui dipertahankan.
- Source lama berbasis single Next/Vinext/D1 dipindahkan ke monorepo Next + Nest + PostgreSQL.
- Deployment Sites lama dibiarkan sebagai referensi visual, bukan backend/source pengembangan baru.
- Domain dan hosting produksi ditunda sampai flow lokal stabil.

## Definition of done milestone ini

1. Pengguna register, memverifikasi email, dan login.
2. Pengguna mengirim laporan beserta metadata bukti privat.
3. Admin membuka review queue dan publish/reject laporan.
4. Identifier pada laporan published langsung dapat dicari.
5. Hasil dapat membuka profil entity dan detail kasus publik.

## Ditunda

Google OAuth produksi, dispute penuh, claim profile, verified middleman workflow, push notification delivery, Redis, graph intelligence, fuzzy duplicate merge, analytics, dan deployment/domain produksi.

## Status handoff

Phase 1 dan vertical slice minimum telah selesai pada commit `9b2b1c6`. Master spec verbatim telah ditambahkan pada commit `555b19c`.

Vertical slice awal Phase 5 untuk konfirmasi transaksi berhasil juga telah dibangun:

`login → kirim konfirmasi → review admin → approve/reject → tampil di search/profil`

Implementasi mencakup bukti privat opsional, pembatasan duplikasi user/entity/tanggal, moderation action, larangan self-review moderator, dan pemisahan metrik positif dari risk label.

Struktur aktif:

- `apps/web`: Next.js App Router dan desain publik Valrify yang sudah disetujui.
- `apps/api`: NestJS REST API untuk auth, search, report submission, evidence privat, dan moderation.
- `packages/domain`: normalisasi, masking, risk rules, RBAC, dan report transitions.
- `packages/validation`: skema Zod bersama.
- PostgreSQL lokal: Docker Compose, port `5434`.

Flow yang sudah diuji:

`submit → review queue → publish → exact search → entity profile → public case`

Validasi terakhir: `pnpm lint`, `pnpm test`, dan `pnpm build` lulus. Smoke test API konfirmasi menghasilkan alur `PENDING → APPROVED → public`, kemudian data uji dibersihkan. Endpoint admin menghasilkan 401 untuk publik. Pemeriksaan visual browser masih perlu dilakukan saat browser lokal tersedia.

UX form terbaru memformat nominal rupiah saat diketik, menyediakan catatan keputusan cepat untuk admin, dan memungkinkan sampai delapan nomor/akun dalam satu laporan. Exact identifier yang sudah dikenal dapat menautkan laporan ke profil lama; identifier tambahan baru menjadi bagian profil publik setelah laporan disetujui.

Perubahan terakhir selesai pada commit `e543894`:

- nominal rupiah berformat ribuan dan nilai nol hilang ketika field mulai diisi;
- template catatan cepat approve/reject tetap dapat diedit admin;
- maksimal delapan identifier per laporan;
- exact strong identifier dapat menautkan laporan ke profil lama;
- identifier tambahan baru ditautkan ke profil publik setelah laporan diterbitkan.

Development lokal:

- Web: `http://localhost:3000`
- API: `http://localhost:3001/api`
- Admin demo: `admin@valrify.local`
- User tester: `tester@valrify.local`
- Password demo: `DemoPass!2026`
- Search demo: `ArkaNusa Demo`, `0800 0000 0901`, `arkanusa.demo`, atau `ArkaDemo#VALRIFY`

Untuk melanjutkan setelah mesin/session baru:

```powershell
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Prioritas sesi berikutnya

Pelajari dan jadikan [Steam User Indonesia Report (SUIR)](https://steamuser.com/suir) sebagai referensi produk Indonesia. SUIR menyediakan pencarian nama, nomor rekening/e-wallet, pendataan penipu, serta validasi oleh admin/moderator komunitas. Halaman pelaporannya juga meminta kronologi, bukti chat/transaksi, dan data pelaku.

Arahan produk terbaru dari owner: evaluasi lalu implementasikan tampilan identifier terlapor tanpa sensor, terutama nomor rekening, e-wallet, dan nomor telepon, agar pengguna dapat membandingkan data secara langsung seperti pada database laporan penipu komunitas.

Batasan yang harus dijaga saat implementasi:

- hanya identifier dari laporan berstatus `PUBLISHED` yang boleh tampil penuh;
- data dari laporan `SUBMITTED`, `UNDER_REVIEW`, `REJECTED`, atau bukti privat tidak boleh bocor;
- raw evidence, identitas pelapor ber-role `USER`, email akun, token, dan data autentikasi tetap privat; atribusi nama hanya berlaku bagi uploader dengan role publik tepercaya;
- tampilkan konteks bahwa data berasal dari laporan yang sudah diperiksa admin, bukan putusan hukum;
- perbarui `docs/master-spec.md`, `product-rules.md`, `risk-methodology.md`, arsitektur, masking domain, API publik, SEO, dan test agar kebijakan baru konsisten;
- lakukan review risiko privasi, salah tuduh, koreksi data, dan proses dispute sebelum rilis produksi.

Master spec sudah diperbarui melalui bagian **67. Product Amendment — Published Scam Identifiers**. Kebijakan ini sudah diterapkan pada proyeksi API publik, search, profil entity, dan detail kasus: identifier terlapor tampil penuh hanya ketika terikat langsung ke laporan `PUBLISHED`. Masking tetap menjadi fallback untuk data yang tidak memenuhi syarat, field raw internal tidak ikut dikirim sebagai properti API, dan identifier penuh tidak dimasukkan ke metadata SEO. Implementasi bukan sakelar global yang mematikan masking.

## Arah roadmap produk terbaru

Owner ingin Valrify dapat tumbuh menjadi platform komunitas yang lebih besar, tetapi pengembangannya tetap bertahap:

1. **Selesai:** homepage menampilkan maksimal enam scam report terbaru yang sudah `PUBLISHED`, lengkap dengan link case/entity, identifier utama, uploader publik, dan layout mobile.
2. **Selesai:** halaman `/cara-aman` merangkum panduan Admin Valrify tentang pengecekan Collection/Premier, ticket recovery, FE, seller/rekber, serah-terima kredensial, dan MFA. Policy resmi Riot/Google harus dibedakan dari pengalaman komunitas dan memiliki link sumber langsung.
3. **Scale-up operasional:** pisahkan pengalaman admin/moderator menjadi panel operasional tersendiri dengan navigasi, review queue, evidence review, entity/identifier linking, dispute, audit log, dan statistik moderasi. Pemisahan ini tidak harus berarti repository atau aplikasi terpisah pada tahap awal; boundary route, layout, authorization, dan API harus jelas terlebih dahulu.
4. **Community layer:** Community Post, Comment, serta report/moderation queue v1 sudah tersedia. Fase berikutnya adalah interaksi pada kasus/profil, notifikasi, serta anti-spam dan anti-harassment yang lebih matang.

Komentar tidak boleh memengaruhi risk label secara otomatis, tidak boleh menjadi jalur publikasi tuduhan tanpa bukti, dan tidak boleh membuka identitas pelapor biasa atau bukti privat.

## Admin Panel v1

Control room moderasi di `/admin/reports` sudah mencakup ringkasan laporan dan testi, jumlah keputusan 24 jam terakhir, pencarian dan filter antrean, detail yang dapat dibuka per item, preview gambar bukti privat dalam modal, pemilihan bukti publik, konfirmasi sebelum publish/reject, serta delapan aktivitas moderasi terbaru. Endpoint `/api/admin/overview` dan seluruh endpoint antrean tetap dilindungi role `MODERATOR`/`ADMIN`.

Seed development menyediakan satu scam report `SUBMITTED` dan satu testi `PENDING` agar panel dapat langsung diuji. Seed mengambil ID user tester berdasarkan email setelah upsert supaya aman dijalankan ulang pada database lokal yang sudah pernah dipakai.

## Akun Saya v1

Halaman `/account` menjadi dashboard kontribusi privat untuk user yang sudah login. Halaman menampilkan identitas dan role akun, status verifikasi email, statistik scam report/testi, riwayat laporan, riwayat testi transaksi, status moderasi dalam bahasa umum, catatan moderator untuk item rejected atau needs-info, serta link publik hanya untuk laporan yang sudah `PUBLISHED`.

Endpoint `/api/account/overview` selalu menggunakan actor ID dari sesi dan tidak menerima user ID dari client. Dengan demikian user hanya dapat membaca laporan dan testi miliknya sendiri. Request tanpa sesi ditolak. Edit profil, tambahan bukti setelah submit, dispute, dan correction flow belum termasuk v1.

## Public Profile v1

Halaman `/u/[username]` menjadi identitas komunitas yang dapat dibagikan. User memilih username unik dan bio dari `/account`; email dan data autentikasi tidak pernah masuk response publik. Profil publik hanya menampilkan testi berstatus `APPROVED`. Scam report `PUBLISHED` hanya diatribusikan dan ditampilkan pada profil pemilik role publik tepercaya (`ADMIN`, `MODERATOR`, atau `VERIFIED_MIDDLEMAN`); kiriman user biasa tetap anonim dan tidak muncul pada profil publiknya.

Endpoint publiknya adalah `GET /api/community/users/:username`, sedangkan perubahan profil memakai `PATCH /api/account/profile` yang wajib login. Perubahan username memiliki cooldown tujuh hari; bio tetap dapat diedit saat username terkunci.

## Community Post v1

Halaman `/community` menyediakan feed post teks publik. Semua orang dapat membaca, tetapi hanya user login yang sudah memiliki username publik dapat menulis. Isi dibatasi 3–1.000 karakter dan satu akun hanya dapat membuat satu post per menit. Penulis dapat menghapus post sendiri; moderator/admin dapat menghapus post yang melanggar. Penghapusan bersifat soft delete dengan status `REMOVED`.

Post tampil di public profile dan selalu diberi konteks bahwa post komunitas bukan laporan terverifikasi. Post tidak memengaruhi risk label, tidak menjadi pengganti form scam report, dan tidak boleh digunakan untuk menyebarkan data pribadi atau tuduhan baru. Edit post, lampiran, serta likes belum termasuk v1.

## Comment v1

Thread komentar tersedia langsung di setiap post `/community` dan dimuat saat user membukanya. Semua orang dapat membaca. User login yang sudah memiliki username publik dapat menulis komentar 2–500 karakter dengan batas satu komentar setiap 30 detik. Penulis dapat menghapus komentarnya sendiri; penghapusan menggunakan status `REMOVED`, sehingga komentar hilang dari thread dan tidak masuk jumlah komentar publik.

User login dapat melaporkan komentar user lain memakai alasan dan penjelasan yang sama dengan report post. Report bersifat privat dan satu user hanya dapat melaporkan komentar yang sama sekali. Tab `REPORT COMMENT` di `/admin/community` menggabungkan beberapa report pada komentar yang sama, menampilkan konteks post induk, serta menyediakan keputusan dismiss atau remove dengan alasan wajib. Moderator tidak dapat meninjau komentar miliknya sendiri maupun report yang dikirimnya sendiri. Semua keputusan dicatat dalam `moderation_actions`.

Seed development menyediakan tiga komentar pada post sambutan dan satu report komentar pending agar thread serta antrean admin dapat langsung diuji. Migration `0006_ambiguous_tarantula.sql` menambahkan tabel dan enum Comment v1.

## Reply + Like Comment v1

Komentar mendukung balasan bergaya social feed tanpa nested thread. Tombol `Balas` membuka composer dengan konteks `@username`; hasilnya tetap berada dalam urutan waktu dan menampilkan label “Membalas @username” yang dapat dipakai untuk lompat ke komentar asal. Jika pembuat post ikut berkomentar, namanya mendapat badge `PENULIS`.

Action bar komentar memakai line icon untuk `Suka`, `Balas`, dan `Laporkan`. Setiap user hanya memiliki satu like per komentar dan dapat membatalkannya. Jumlah like bersifat publik, sedangkan daftar like milik sesi dimuat lewat endpoint privat. Dislike sengaja tidak disediakan agar fitur reputasi ringan ini tidak menjadi alat brigading. Seed membentuk contoh balasan berantai dan like; migration `0007_dizzy_mordo.sql` menambahkan self-reference reply serta tabel like.

## Post Like + Lagi Ramai v1

Post community sekarang memiliki tombol `Suka` dengan line icon, hitungan publik, dan status like yang tetap tersimpan setelah reload. Feed `/community` dapat diganti antara `TERBARU` dan `LAGI RAMAI`. Ranking ramai v1 membatasi engagement pada post 30 hari terakhir dengan bobot dua poin per like dan tiga poin per komentar published; tiga hasil teratas yang memiliki engagement mendapat badge urutan ramai.

Like dan ranking hanya membantu discovery community. Keduanya tidak mengubah risk label, status scam report, reputasi seller/entity, atau hasil moderasi. Seed menyediakan like pada dua post demo dan migration `0008_supreme_gamma_corps.sql` menambahkan tabel like post.

Collapsed reply pada kartu post mengikuti pola Threads: jumlah komentar tidak lagi tampil dua kali. Saat tertutup, kartu hanya menampilkan satu top reply berdasarkan like terbanyak dan CTA `LIHAT SEMUA X BALASAN`. Ketika thread dibuka, preview tersebut disembunyikan dan seluruh komentar dimuat. Pemilihan top reply dilakukan dengan satu batch query untuk seluruh feed, bukan request per post.

## Home hierarchy + Community discovery

Homepage mempertahankan pencarian data penipu sebagai fokus pertama. Urutan konten setelah hero adalah prinsip pengecekan, scam report terbaru yang sudah diperiksa admin, tiga post Community teratas dari ranking 30 hari, cara pakai, lalu disclaimer. Section Community memakai latar gelap agar menjadi jeda visual, tetapi ditempatkan setelah scam report supaya fungsi safety tetap lebih utama daripada social feed.

Navbar home desktop sekarang memiliki link `COMMUNITY`; hamburger mobile sebelumnya sudah memuat tujuan yang sama. Breakpoint hamburger diperluas sampai 980px agar tambahan item navbar tidak bertabrakan pada tablet. Kartu Community di home menampilkan peringkat, identitas publik, cuplikan post, like, jumlah balasan, tanggal, serta deep-link ke halaman `/community/post/{id}`.

## Notification v1

User login memiliki inbox privat di `/notifications` dan lonceng navbar dengan badge unread. V1 mencakup like post, like komentar, balasan post, dan balasan komentar. Aksi sendiri tidak membuat notifikasi; unlike, penghapusan oleh pemilik, serta removal moderator membersihkan event yang sudah tidak relevan. Inbox bisa menandai satu item saat dibuka atau seluruh item sekaligus, lalu badge navbar diperbarui tanpa reload.

Seed menyediakan notifikasi belum dibaca untuk akun tester, admin, dan verified middleman. Migration `0009_smiling_machine_man.sql` menambahkan tabel `notifications`. Kolom utama Community desktop juga diberi padding kiri 12px agar area judul dan feed tidak terlalu dekat dengan sidebar; padding kembali nol pada tablet/mobile.

Tampilan Notification mobile dibuat sebagai inbox compact: hero diperkecil, ringkasan unread menjadi satu baris, spacing vertikal dipangkas, dan avatar serta baris aktivitas memakai ukuran mobile tersendiri. Pada layar sangat kecil, deskripsi hero disembunyikan agar daftar aktivitas lebih cepat terlihat.

## Community Post Detail v1

Setiap post published memiliki halaman shareable `/community/post/{id}` dengan metadata sosial, identitas penulis, role, waktu, isi lengkap, like, bagikan, report, delete milik penulis, dan seluruh thread komentar yang langsung terbuka. Feed, homepage, public profile, dan inbox notifikasi sekarang mengarah ke halaman ini.

Notifikasi yang terkait komentar memakai hash `#community-comment-{id}`. Komentar tujuan sudah dirender dari server, mendapat highlight melalui `:target`, dan memiliki scroll margin agar tidak tertutup area atas. Endpoint publik baru `GET /api/community/posts/:id` hanya mengembalikan post `PUBLISHED`; ID invalid, post hilang, atau post removed menghasilkan 404. Tampilan detail memakai hierarki desktop dan override mobile compact tersendiri.

## Community Search v1

Halaman `/community/search` mencari dua jenis data publik lewat tab `POST` dan `ANGGOTA`. Tab post mencari potongan isi post published lalu menampilkan penulis, role, cuplikan dengan kata cocok, like, balasan, tanggal, dan link detail. Tab anggota mencari display name atau username publik lalu menampilkan role, bio singkat, jumlah post, dan link public profile.

Search memakai minimal dua dan maksimal 80 karakter, case-insensitive, serta meng-escape wildcard `%`, `_`, dan backslash. Endpoint `GET /api/community/search?q=` tidak menyentuh identifier atau scam report supaya fungsi “Cek data penipu” tetap jelas terpisah. Sidebar feed memiliki form cepat menuju search; halaman hasil memiliki empty state, shortcut silang antar-tab, desktop two-column post grid, serta layout mobile satu kolom yang compact.

## Report Post + Community Moderation v1

User login dapat melaporkan post milik user lain melalui modal pada `/community`. Alasan terstruktur meliputi spam, pelecehan, data pribadi, tuduhan scam, dan lainnya; penjelasan 10–500 karakter wajib diisi. Satu user hanya dapat melaporkan post yang sama sekali dan identitas pelapor tidak ditampilkan ke publik atau penulis post.

Antrean moderator berada di `/admin/community`. Beberapa laporan untuk post yang sama digabung menjadi satu item. Moderator/admin memilih `DISMISS` untuk mempertahankan post atau `REMOVE` untuk melakukan soft delete, wajib memberikan alasan, dan tidak boleh meninjau post miliknya sendiri. Keputusan menyelesaikan semua laporan pending pada post tersebut dan dicatat di `moderation_actions`. Seed development menyediakan satu report post pending.

## Implementasi evidence dan scam report terbaru

- Istilah UI utama memakai "scam report" secara selektif, tetap disertai bahasa netral dan disclaimer hukum.
- Urutan input identifier memprioritaskan rekening, e-wallet, telepon, lalu username; label Riot menjadi "Username Riot / Riot ID".
- Provider rekening/e-wallet memakai input searchable berbasis daftar bank dan e-wallet populer Indonesia, tetapi tetap menerima provider lain.
- Pelapor dapat memenuhi syarat bukti dengan link posting HTTP(S), upload file, atau keduanya.
- Admin memilih gambar mana yang aman menjadi bukti publik ketika publish; bukti lain tetap privat.
- Detail kasus menyediakan tombol link posting dan modal gambar yang dapat ditutup tanpa pindah halaman.
- Migration `0002_light_james_howlett.sql` menambahkan `reports.evidence_url`.

## Implementasi pencarian nama dan alias terbaru

- Search bukan exact-only: nama seller, alias/nama asli, nama Facebook, nama pemilik rekening, Discord, Riot, dan username lain dapat ditemukan dari potongan minimal dua karakter.
- Rekening, e-wallet, dan telepon tetap exact setelah normalisasi untuk mencegah enumerasi lewat query angka pendek.
- Hasil search dideduplikasi menjadi satu kartu per profil dan hanya partial-search data yang berasal dari laporan `PUBLISHED`.
- Nama seller adalah judul profil utama. Nama terkait ditampilkan terstruktur sebagai alias, termasuk nama pemilik rekening yang dapat diisi langsung di bawah nomor rekening.
- Nama tidak pernah dipakai untuk auto-merge profil; penggabungan otomatis tetap membutuhkan exact strong identifier.
- Form laporan memakai baris komposit: rekening = bank + nomor + nama pemilik opsional; e-wallet = provider + nomor + nama pemilik opsional; Riot = username + nickname opsional; Facebook = nama + link profil opsional. Tipe turunan tidak ditampilkan sebagai pilihan terpisah.
- Dropdown provider adalah combobox internal bergaya Valrify dan pesan validasi wajib ditampilkan dalam form berbahasa Indonesia.
- Detail kasus memformat tanggal kejadian dalam bahasa Indonesia dan memakai status `PUBLISHED`, bukan `TAYANG`.
- Seluruh kartu hasil search dapat ditekan. Baris laporan memiliki CTA `BACA LAPORAN`, hover/focus state, dan target sentuh yang jelas.
- Typography dan spacing halaman publik memiliki override mobile yang lebih compact, termasuk wrapping identifier dan judul laporan panjang.
- Hero `CEK SEBELUM TRANSAKSI` memiliki skala mobile khusus yang lebih kecil daripada heading desktop.
- Laporan publik menampilkan uploader bernama hanya untuk `ADMIN`, `MODERATOR`, dan `VERIFIED_MIDDLEMAN`; user biasa tetap berlabel `Anggota komunitas`. Badge uploader tidak menggantikan status review.
- Semua halaman ber-Header mendapat link kembali mobile dengan fallback tujuan internal yang kontekstual; case kembali ke profil, profil kembali ke pencarian, dan halaman umum kembali ke beranda.

## Catatan source of truth

Master Build Prompt Valrify telah disalin verbatim ke `docs/master-spec.md` dan merupakan source of truth produk. Dokumen ini, `product-rules.md`, `risk-methodology.md`, `moderation.md`, dan `architecture.md` adalah handoff implementasi—bukan pengganti master spec.

## Penutupan sesi 22 Agustus 2026

Milestone lokal saat ini sudah melampaui vertical slice awal. Fitur aktif mencakup scam report dengan identifier komposit dan evidence privat/publik, pencarian partial yang aman, homepage hierarchy, panduan Cara Amanin, Admin Panel v1, Akun Saya v1, Public Profile v1, Community Post, report/moderation queue, komentar dan reply datar, like post/komentar, feed Lagi Ramai, Notification v1, Community Post Detail, serta Community Search.

Migration development `0002` sampai `0009` sudah dibuat dan diterapkan pada PostgreSQL lokal. Seed aman dijalankan ulang, mempertahankan konten user yang tidak cocok dengan fixture, menyediakan akun demo lintas role, moderation queue, engagement, balasan, dan notifikasi unread. Password default akun demo adalah `DemoPass!2026`, kecuali dioverride melalui environment variable.

Verifikasi terakhir sebelum handoff:

- `pnpm lint` lulus.
- `pnpm test` lulus 20/20.
- `pnpm build` lulus dan mengenali route dinamis Community Post Detail serta Community Search.
- Smoke test API lulus untuk notification read/unread, lifecycle like/unlike, larangan self-notification, post detail/404, deep link komentar, Community Search post/anggota, query satu karakter, dan wildcard input.
- `git diff --check` lulus; warning CRLF Windows bukan error whitespace.

Prioritas yang disarankan untuk sesi berikutnya adalah Mention v1 dengan autocomplete dari Community Search, lalu Bookmark/Saved Post v1. Follow system sebaiknya ditunda sampai pagination, preference feed, dan aturan notifikasinya dirancang. Sebelum production, kebutuhan utama tetap provider email, object storage, rate limiting terdistribusi, pagination/cursor, indeks pencarian yang sesuai skala, observability, backup, dan integration/e2e test database.

## Keputusan arah produk 28 Agustus 2026

Owner memilih kembali memusatkan Valrify pada fungsi safety dan peningkatan fitur yang sudah ada. Fitur sosial Community tidak menjadi prioritas karena percakapan komunitas sudah lebih mudah dilakukan melalui Facebook dan Discord. Community direncanakan untuk disederhanakan menjadi profil publik dan testi; route serta data Community yang sudah ada sebaiknya disembunyikan terlebih dahulu dan tidak langsung dihapus agar keputusan masih dapat dibalik.

Prioritas produk berikutnya bukan Mention, Bookmark, atau Follow. Fokus yang disetujui adalah:

- pencarian identifier dan database laporan;
- perlindungan dari penipuan pembayaran, rekber palsu, dan hackback;
- kualitas scam report, evidence, moderasi, dan informasi publik;
- profil reputasi dan testi;
- panduan keamanan serta kanal resmi anti-impersonation;
- perbaikan homepage dengan struktur yang langsung, proses yang jelas, dan aturan yang mudah dipahami seperti kekuatan informasi pada Julie Sean Rekber, tanpa menyalin visual atau mereknya.

Link posting bukti di Facebook menjadi rekomendasi kuat untuk pengiriman laporan, tetapi bukan syarat wajib selama tersedia evidence privat yang dapat diperiksa moderator. Kejadian lama tetap boleh dilaporkan; umur kejadian tidak membuat laporan ditolak otomatis. Kasus dan audit dapat dipertahankan, sedangkan keterkaitan identifier tetap harus dapat dikoreksi atau disengketakan bila ditemukan kesalahan atau perubahan kepemilikan.

Visi rekber telah diparkir di [rekber-roadmap.md](rekber-roadmap.md). Rekber adalah fase paling akhir dan tidak boleh diimplementasikan sebelum ada perintah baru dari owner. Sampai saat itu, jangan biarkan kebutuhan rekber memperlebar scope sprint safety saat ini.

### Implementasi fokus safety pertama

Homepage tidak lagi mengambil atau menampilkan feed Community. Section `Lagi Ramai` diganti dengan tiga risiko utama—penipuan pembayaran, rekber palsu, dan hackback—beserta CTA ke pencarian, panduan Cara Amanin, dan form scam report. Link Community serta lonceng notifikasi sosial dihapus dari navigasi publik desktop/mobile, tetapi route, API, dan data lama tidak dihapus.

Public profile sekarang berfungsi sebagai profil reputasi dan hanya menampilkan scam report dari peran tepercaya serta testi yang dikirim pengguna. Post Community tidak lagi tampil pada profil. Dashboard akun mengganti statistik aktivitas Community dengan status profil publik. Admin moderation Community tetap tersedia untuk menangani data/report lama.

### Pedoman bahasa antarmuka

Copy antarmuka diaudit ulang agar istilah sistem tidak dibebankan kepada pengguna. Untuk aksi yang sama, gunakan `ditampilkan` atau `muncul di Valrify`, bukan campuran `diterbitkan`, `ditayangkan`, `terbit`, dan `publikasi`. Gunakan `pemeriksaan admin`, `bukti`, `nomor dan akun`, `nama lain`, `antrean`, serta `muat ulang`; hindari `moderasi`, `review`, `evidence`, `identifier`, `alias`, `queue`, dan `refresh` pada teks yang terlihat pengguna. Keterangan data terbatas harus menjelaskan langsung siapa yang bisa melihatnya, bukan hanya menyebutnya `privat`.

Halaman `/methodology` dan tautan `Cara Baca` dihapus dari produk. Penjelasan tanda risiko tidak membutuhkan halaman tersendiri; peringatan yang dibutuhkan pengguna sudah diberikan langsung pada hasil pencarian dan halaman terkait.

### Testi langsung tampil

Keputusan terbaru owner menggantikan rancangan moderasi testi sebelumnya. Testi transaksi langsung berstatus `APPROVED` dan tampil setelah dikirim oleh pengguna dengan email terverifikasi; tidak ada antrean setujui/tolak testi di panel admin. Migrasi `0010_rich_big_bertha.sql` mengubah default status menjadi `APPROVED` dan memindahkan testi lama yang masih `PENDING` ke `APPROVED`. Bukti opsional tetap hanya dapat diakses admin jika kelak diperlukan untuk menangani penyalahgunaan, tetapi bukan syarat publikasi testi. Copy publik harus membedakan dengan jelas bahwa laporan diperiksa admin sedangkan testi merupakan kiriman langsung pengguna.

### Susunan panduan Cara Aman

Panduan `/cara-aman` mengikuti urutan kebutuhan pembeli: istilah, pemeriksaan sebelum transfer, pemeriksaan setelah menerima akun, langkah wajib mengamankan akun, lalu pemeriksaan First Email yang bersifat opsional. Semua bagian utama memakai dropdown tertutup pada tampilan HP agar mudah dipindai; Amankan Akun tetap paling ditonjolkan tetapi tidak dibuka otomatis. Desktop tetap menampilkan seluruh isi. Alur transaksi dan aturan Riot tetap terlihat, sedangkan daftar isi berbentuk deretan tombol dihapus karena menduplikasi judul bagian dan terlihat janggal di desktop.

### Nominal kerugian dihapus dari scam report

Scam report tidak lagi meminta atau menampilkan nominal uang yang hilang. Nilai tersebut tidak membantu fungsi utama pencarian nomor dan akun serta menambah beban pelapor. Kolom database lama tetap dipertahankan dengan nilai baru `0` agar data laporan terdahulu tidak dihapus dan migrasi destruktif tidak diperlukan. Nominal transaksi pada testi tetap dipertahankan karena merupakan konteks reputasi transaksi, bukan nilai kerugian laporan.

### Sprint 1 menuju beta

Roadmap beta dibagi menjadi empat sprint di [beta-roadmap.md](beta-roadmap.md). Sprint pertama mengganti konteks transaksi lama dengan lima kategori masalah: penipuan pembayaran, rekber palsu, hackback, data akun tidak sesuai, dan lainnya. Form tidak lagi meminta judul; server membuat judul netral berdasarkan kategori. Kategori tampil pada antrean admin dan detail laporan publik, sedangkan nilai lama seperti `ACCOUNT_PURCHASE` tetap memiliki label yang dapat dibaca tanpa migrasi database.

## Cloudflare R2 evidence storage

Adapter evidence mendukung `STORAGE_DRIVER=local` untuk development dan `STORAGE_DRIVER=r2` untuk staging/production. R2 memakai S3-compatible API dengan bucket private; upload dan pembacaan tetap melewati NestJS sehingga aturan akses admin, status laporan, approval bukti publik, dan validasi MIME yang sudah ada tidak berubah. Konfigurasi R2 wajib gagal cepat saat endpoint, bucket, access key, atau secret key tidak tersedia. Credential tidak boleh masuk repository atau dokumentasi.

## Transactional auth email

Brevo REST API mengirim email verifikasi akun dan reset password ketika `BREVO_API_KEY` serta sender tersedia. Tautan verifikasi berlaku 24 jam dan tautan reset berlaku 1 jam. Token mentah hanya dikirim lewat email; PostgreSQL menyimpan SHA-256 token dalam `email_verification_tokens` atau `password_reset_tokens`. Request baru mengganti token lama dan penggunaan yang berhasil menghapus seluruh token sejenis milik user. Development tanpa Brevo mempertahankan shortcut token lokal, tetapi production tidak pernah mengembalikan token tersebut melalui API.
