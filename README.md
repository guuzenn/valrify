# VLRFY

Platform reputasi dan pemeriksaan risiko untuk transaksi akun Valorant Indonesia. VLRFY membantu komunitas mengecek identifier, membaca laporan yang telah dimoderasi, dan mengirim laporan berbasis bukti tanpa menjadi blacklist atau database doxxing.

## Milestone saat ini

Phase 1 + minimum vertical slice:

`submit report → admin review → publish/reject → search identifier → view entity/case`

Scope lengkap dan penundaan fitur tercatat di [`docs/session-context.md`](docs/session-context.md).

## Stack

- React + TypeScript + Vinext App Router
- Tailwind CSS v4 untuk pipeline styling, dengan design system VLRFY custom
- Cloudflare D1 + Drizzle schema untuk data relasional
- Cloudflare R2 untuk raw evidence privat
- Sites runtime identity/SIWC dan RBAC server-side

## Setup

Persyaratan: Node.js 22.13+.

```bash
npm install
npm run dev
```

Dev server akan mencetak URL lokal. Data demo fiktif dibuat otomatis saat database pertama digunakan. Coba pencarian `0800 0000 0901` atau `ArkaNusa#DEMO`.

## Environment

Salin `.env.example` menjadi `.env.local`. Untuk akses moderator/admin, isi `VLRFY_ADMIN_EMAILS` dengan email identity yang digunakan saat sign-in. Secret deployment dikelola melalui Sites, bukan disimpan di repository.

## Database

Schema source ada di `db/schema.ts`. Generate migration setelah perubahan schema:

```bash
npm run db:generate
```

Runtime juga menjalankan idempotent `CREATE TABLE IF NOT EXISTS` agar preview pertama dapat digunakan. D1 adalah source of truth data; R2 hanya menyimpan file evidence.

## Quality checks

```bash
npm run lint
npm test
```

Unit tests mencakup normalisasi, masking, risk rules, RBAC, status transition, dan exact matching. Public route hanya membaca report berstatus `PUBLISHED`; evidence endpoint selalu memeriksa role moderator/admin.

## Dokumen

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/product-rules.md`](docs/product-rules.md)
- [`docs/risk-methodology.md`](docs/risk-methodology.md)
- [`docs/moderation.md`](docs/moderation.md)

VLRFY by reyv.
