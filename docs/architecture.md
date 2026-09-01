# Arsitektur Valrify Phase 1

## Sasaran

Arsitektur ini hanya mendukung vertical slice pertama: pengguna terverifikasi mengirim laporan, moderator meninjau dan menerbitkan, lalu publik menemukan identifier dan membuka profil serta kasus.

## Batas komponen

```text
Browser
  ├─ Next.js web (apps/web)
  └─ NestJS REST API (apps/api)
       ├─ Auth + RBAC
       ├─ Public search/profile/case
       ├─ Report submission
       ├─ Admin review
       ├─ PostgreSQL / Drizzle
       └─ EvidenceStorage adapter

Shared packages
  ├─ @valrify/domain
  └─ @valrify/validation
```

UI tidak mengakses database secara langsung. Semua operasi domain melewati API sehingga web dapat dipindahkan hosting tanpa mengubah aturan bisnis.

## Reputasi positif

Phase 5 menambahkan `transaction_confirmations` sebagai sinyal positif yang terpisah dari laporan risiko. Pengguna terverifikasi mengirim konfirmasi untuk entity yang sudah ada, lalu moderator/admin menyetujui atau menolak. Bukti bersifat opsional dan tetap privat melalui adapter `EvidenceStorage`. Kombinasi user, entity, dan tanggal transaksi unik untuk membatasi duplikasi dasar.

Konfirmasi yang masih `PENDING` atau sudah `REJECTED` tidak pernah tampil publik. Hanya status `APPROVED` yang dihitung dan ditampilkan pada search serta profil entity. Moderator tidak dapat meninjau kirimannya sendiri.

## Data inti

Relasi utama dipisahkan antara `entities`, `identifiers`, dan `reports`. Identifier menyimpan nilai asli, nilai normalisasi untuk pencarian tepat, serta nilai termasking sebagai fallback aman. Proyeksi API publik hanya menampilkan nilai asli ketika identifier terikat langsung ke laporan berstatus `PUBLISHED`; seluruh status lain dan identifier yang tidak memenuhi syarat tetap menggunakan nilai termasking. Tabel penghubung memungkinkan identifier yang sama muncul di entity dan laporan berbeda tanpa menyimpan array JSON.

Status report dicatat pada report aktif dan pada history. Tindakan moderator juga masuk moderation action agar keputusan dapat diaudit.

## Community layer

`community_posts` terpisah dari `reports` agar obrolan user tidak masuk ke risk engine atau terlihat sebagai hasil moderasi laporan. Endpoint baca feed bersifat publik; endpoint tulis dan soft delete dilindungi JWT. Pembuatan post mensyaratkan username publik, panjang teks 3–1.000 karakter, serta throttle satu post per menit. Public profile mengambil post `PUBLISHED` milik user, sedangkan post `REMOVED` tidak masuk proyeksi publik.

`GET /api/community/posts/:id` menyediakan satu post `PUBLISHED` untuk halaman shareable `/community/post/:id`. Komentar halaman detail tetap diambil melalui endpoint komentar publik dan dirender terbuka dari server. URL hash `community-comment-{id}` menjadi deep link komentar tanpa menambah nesting atau endpoint khusus. Post yang tidak ada atau sudah `REMOVED` dikembalikan sebagai 404.

`GET /api/community/search?q=` menjadi jalur discovery khusus Community. Query minimal dua karakter memakai `ILIKE` terhadap body post published dan nama/username publik. Response memisahkan `posts` maksimal 30 hasil terbaru dan `members` maksimal 20 hasil, membawa hanya proyeksi publik serta hitungan engagement/post. Wildcard input di-escape dan panjang query dibatasi 80 karakter. Endpoint ini tidak memakai tabel identifier scam report.

`community_post_reports` menyimpan satu report per kombinasi post dan pelapor. Queue admin mengelompokkan seluruh report `PENDING` berdasarkan post. Review mengubah seluruh report pending dalam satu transaksi, melakukan soft delete post bila dipilih, dan menulis `moderation_actions.community_post_id` agar keputusan dapat diaudit. Identitas pelapor hanya tersedia pada endpoint admin ber-role moderator/admin.

`community_comments` menyimpan thread datar di bawah post dan menggunakan status `PUBLISHED`/`REMOVED` agar penghapusan tetap dapat diaudit. Endpoint publik hanya mengambil komentar pada post yang masih terbit dan menghitung komentar yang masih `PUBLISHED`. Pembuatan komentar membutuhkan username publik, teks 2–500 karakter, serta throttle satu komentar per 30 detik.

Kolom `reply_to_comment_id` adalah self-reference nullable dengan `ON DELETE SET NULL`. API hanya menerima target reply yang masih `PUBLISHED` dan berada pada post yang sama. UI merender semua balasan secara kronologis dalam satu tingkat, sedangkan relasi target dipakai untuk label “Membalas @username” dan navigasi ke komentar asal.

`community_comment_likes` memakai kombinasi unik comment/user. Endpoint toggle dilindungi JWT, sementara jumlah like masuk proyeksi komentar publik. Status like milik user dimuat dari endpoint privat terpisah agar endpoint publik tidak bergantung pada sesi dan tidak membocorkan identitas pemberi like.

`community_post_likes` memakai pola unik post/user yang sama. `GET /community/posts` menerima sort `latest` atau `popular`; mode popular menghitung engagement post 30 hari terakhir dari `like * 2 + komentar published * 3`, kemudian memakai waktu post sebagai tie-breaker. Endpoint publik hanya mengirim jumlah, sedangkan liked post milik actor tersedia melalui endpoint JWT terpisah.

Response feed juga membawa satu `topReply` per post. API mengambilnya dalam satu batch query `DISTINCT ON`, diurutkan berdasarkan jumlah like lalu waktu komentar, sehingga render feed tidak membuat satu request atau query tambahan untuk setiap post. Thread penuh tetap dimuat hanya ketika user membuka CTA balasan.

`community_comment_reports` memisahkan laporan komentar dari konten publik. Satu pelapor hanya dapat mengirim satu report per komentar. Queue admin menggabungkan report pending berdasarkan komentar dan membawa konteks post induknya. Keputusan dismiss/remove disimpan dalam satu transaksi bersama pembaruan seluruh report pending dan `moderation_actions.community_comment_id`; identitas serta detail pelapor tidak pernah masuk proyeksi publik.

`notifications` menyimpan inbox sosial privat dengan recipient, actor, tipe aktivitas, target post/comment, status baca, dan `event_key` unik agar satu aksi tidak membuat duplikat. Event dibuat oleh service Community ketika ada like atau balasan dari user lain. Unlike serta penghapusan konten menghapus event terkait. Endpoint JWT mencakup inbox 50 item terbaru, unread count, tandai satu dibaca, dan tandai semua dibaca. V1 belum memakai push, email, mention, maupun notifikasi moderasi.

Username disimpan lowercase dan unik. `users.username_changed_at` menjadi sumber aturan cooldown tujuh hari; perubahan bio tidak mengubah timestamp tersebut.

## Autentikasi dan otorisasi

Email/password menggunakan hash bcrypt dan verifikasi email. Brevo REST API mengirim tautan verifikasi 24 jam dan tautan reset password 1 jam. Database hanya menyimpan hash token sekali pakai; token lama dihapus ketika user meminta tautan baru dan seluruh token terkait dihapus setelah berhasil digunakan. Endpoint permintaan reset dan kirim ulang verifikasi memakai respons generik agar tidak membocorkan apakah sebuah email terdaftar. Setelah verifikasi, API menerbitkan JWT melalui cookie HTTP-only. Guard API memeriksa user aktif dan role `USER`, `VERIFIED_MIDDLEMAN`, `MODERATOR`, atau `ADMIN`.

Pada development tanpa konfigurasi Brevo, token verifikasi dan reset dapat dikembalikan ke UI agar alur bisa diuji tanpa penyedia email. Perilaku ini tidak boleh aktif pada production.

## Rate limiting

`ThrottlerGuard` aktif global dengan batas dasar 180 request per menit per IP. Endpoint berbiaya tinggi atau rawan abuse memakai batas khusus: login 8 per 5 menit, register 5 per jam, permintaan email 3 per 15 menit, verifikasi/reset token 10 per 15 menit, masing-masing endpoint search 60 per menit, upload laporan atau bukti transaksi 5 per jam, dan laporan konten Community 10 per jam. Guard berjalan sebelum interceptor upload sehingga request yang sudah melewati batas ditolak sebelum file diproses.

Penyimpanan counter masih in-memory dan sesuai untuk satu instance API. Production multi-instance memerlukan storage limiter bersama seperti Redis. `TRUST_PROXY_HOPS` harus sama dengan jumlah reverse proxy tepercaya di depan API; nilai `0` tidak memercayai forwarded IP header dan menjadi default yang aman.

## Bukti

Bukti mentah tidak pernah disajikan oleh endpoint publik. `EvidenceStorage` memakai disk lokal ketika `STORAGE_DRIVER=local` dan bucket private Cloudflare R2 ketika `STORAGE_DRIVER=r2`. Endpoint admin tetap memeriksa role sebelum mengambil dan melakukan streaming bukti; endpoint publik juga tetap memeriksa status `PUBLISHED`, approval publik, dan MIME gambar. Bucket R2 tidak membutuhkan akses publik atau CORS karena browser tidak berkomunikasi langsung dengan storage.

Laporan dapat menyimpan `evidenceUrl` HTTP(S) menuju posting bukti eksternal. Untuk upload gambar, `report_evidence.is_public_approved` menjadi gate eksplisit moderator. Endpoint publik melakukan join ulang ke report dan hanya menyajikan file ketika report `PUBLISHED`, evidence disetujui publik, dan MIME bertipe gambar. UI detail kasus membuka gambar tersebut dalam modal; PDF dan upload yang tidak disetujui tetap hanya tersedia melalui endpoint admin.

## Risiko dan pencarian

Normalisasi, masking, status transition, RBAC matrix, moderation transition konfirmasi, dan risk label berada di package domain agar konsisten antara web, API, seed, dan test. Pencarian memakai exact normalized match untuk rekening, e-wallet, dan telepon. Nama seller, nama asli, nama Facebook, nama pemilik rekening, Discord, Riot, dan username lain dari laporan `PUBLISHED` dapat dicari dengan potongan minimal dua karakter. Hasil dideduplikasi menjadi satu kartu per entity. Partial match hanya untuk discovery dan tidak pernah memicu identity merge; graph analysis lanjutan ditunda.

Satu laporan dapat membawa sampai delapan identifier setelah field komposit diurai. Satu baris rekening menghasilkan identifier nomor dan, bila diisi, nama pemilik; e-wallet berlaku sama; Riot dapat menghasilkan username dan nickname; Facebook dapat menghasilkan nama dan URL. Identifier kuat yang sudah tertaut—telepon, rekening, e-wallet, Discord, Facebook URL, atau Riot ID—dapat mengarahkan laporan baru ke entity yang sama. Nama seller menjadi `entities.display_name`; nama asli, nama Facebook, dan nama pemilik rekening/e-wallet tetap menjadi identifier nama terkait. Identifier baru tetap berada pada report selama moderasi dan baru ditautkan ke profil publik ketika laporan diterbitkan. Auto-link tidak dilakukan dari nama atau nickname, dan juga tidak dilakukan jika identifier kuat yang dikirim mengarah ke lebih dari satu entity.
