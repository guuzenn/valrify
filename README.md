# VLRFY

Platform reputasi dan pemeriksaan risiko untuk transaksi akun Valorant Indonesia. Bahasa publik sengaja netral: VLRFY menampilkan laporan, bukti, dan sinyal komunitas—bukan menetapkan seseorang bersalah secara hukum.

## Vertical slice saat ini

Monorepo ini berfokus pada alur inti:

`submit laporan → review admin → publish → search identifier → lihat profil/kasus`

dan vertical slice reputasi positif:

`konfirmasi transaksi → review admin → approve/reject → tampil di profil entity`

- `apps/web` — Next.js App Router dan design system VLRFY
- `apps/api` — NestJS REST API, autentikasi, RBAC, search, laporan, dan moderasi
- `packages/domain` — normalisasi identifier, masking, risk rules, RBAC, status transition
- `packages/validation` — skema validasi bersama
- PostgreSQL — data relasional melalui Drizzle ORM
- local evidence adapter — bukti privat untuk development; dapat diganti S3/R2 kemudian

## Menjalankan lokal

Prasyarat: Node.js, pnpm, dan Docker Desktop.

```powershell
Copy-Item .env.example .env
pnpm install
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Web berjalan di `http://localhost:3000`, API di `http://localhost:3001/api`, dan health check di `http://localhost:3001/api/health`.

Data demo development:

- Admin: `admin@vlrfy.local`
- Password: `DemoPass!2026`
- Pencarian: `ArkaNusa Demo`, `0800 0000 0901`, `arkanusa.demo`, atau `ArkaDemo#VLRFY`

Seed sepenuhnya fiktif dan tidak boleh dianggap sebagai data kasus nyata.

## Perintah utama

```text
pnpm dev                 web + API
pnpm build               build semua workspace
pnpm lint                TypeScript check
pnpm test                unit test domain/API
pnpm db:up / db:down     PostgreSQL Docker
pnpm db:generate         buat SQL migration
pnpm db:migrate          terapkan migration
pnpm db:seed             isi data demo
```

## Batas milestone

Fitur lanjut seperti dispute lengkap, profile claiming, verified middleman workflow, graph intelligence, fuzzy merge, Google OAuth produksi, Redis, dan object storage hosted sengaja belum dibangun. Konfirmasi transaksi berhasil sudah tersedia dengan moderasi wajib dan bukti privat opsional. Deployment Sites lama hanya menjadi referensi visual; monorepo lokal ini adalah source of truth pengembangan berikutnya.

Dokumentasi lanjut tersedia di [docs/architecture.md](docs/architecture.md), [docs/product-rules.md](docs/product-rules.md), [docs/risk-methodology.md](docs/risk-methodology.md), dan [docs/moderation.md](docs/moderation.md).
