# Arsitektur VLRFY Phase 1

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
  ├─ @vlrfy/domain
  └─ @vlrfy/validation
```

UI tidak mengakses database secara langsung. Semua operasi domain melewati API sehingga web dapat dipindahkan hosting tanpa mengubah aturan bisnis.

## Data inti

Relasi utama dipisahkan antara `entities`, `identifiers`, dan `reports`. Identifier menyimpan nilai tampilan, nilai normalisasi untuk pencarian tepat, serta nilai termasking untuk publik. Tabel penghubung memungkinkan identifier yang sama muncul di entity dan laporan berbeda tanpa menyimpan array JSON.

Status report dicatat pada report aktif dan pada history. Tindakan moderator juga masuk moderation action agar keputusan dapat diaudit.

## Autentikasi dan otorisasi

Email/password menggunakan hash bcrypt dan verifikasi email. Setelah verifikasi, API menerbitkan JWT melalui cookie HTTP-only. Guard API memeriksa user aktif dan role `USER`, `VERIFIED_MIDDLEMAN`, `MODERATOR`, atau `ADMIN`.

Pada development, token verifikasi dapat dikembalikan ke UI agar alur bisa diuji tanpa penyedia email. Perilaku ini tidak boleh aktif pada production.

## Bukti

Bukti mentah tidak pernah disajikan oleh endpoint publik. `EvidenceStorage` saat ini memakai disk lokal untuk development. Endpoint admin memeriksa role sebelum streaming bukti. Adapter ini disiapkan agar dapat diganti dengan object storage dan signed URL tanpa mengubah report service.

## Risiko dan pencarian

Normalisasi, masking, status transition, RBAC matrix, dan risk label berada di package domain agar konsisten antara web, API, seed, dan test. Pencarian Phase 1 memprioritaskan exact normalized match; fuzzy identity merge dan graph analysis ditunda.
