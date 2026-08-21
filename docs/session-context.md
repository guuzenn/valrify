# Konteks Implementasi

## Keputusan 21 Agustus 2026

- Master spec VLRFY adalah product source of truth.
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

Google OAuth produksi, reset password, transaksi berhasil, dispute penuh, claim profile, verified middleman workflow, notification/email delivery, Redis, S3/R2, graph intelligence, fuzzy duplicate merge, analytics, dan deployment/domain produksi.

## Status handoff

Phase 1 dan vertical slice minimum telah selesai pada commit `9b2b1c6`.

Struktur aktif:

- `apps/web`: Next.js App Router dan desain publik VLRFY yang sudah disetujui.
- `apps/api`: NestJS REST API untuk auth, search, report submission, evidence privat, dan moderation.
- `packages/domain`: normalisasi, masking, risk rules, RBAC, dan report transitions.
- `packages/validation`: skema Zod bersama.
- PostgreSQL lokal: Docker Compose, port `5434`.

Flow yang sudah diuji:

`submit → review queue → publish → exact search → entity profile → public case`

Validasi terakhir: `pnpm lint`, `pnpm test`, dan `pnpm build` lulus. Health API dan halaman search menghasilkan HTTP 200. Evidence menghasilkan 401 untuk publik dan 200 untuk admin.

Development lokal:

- Web: `http://localhost:3000`
- API: `http://localhost:3001/api`
- Admin demo: `admin@vlrfy.local`
- Password demo: `DemoPass!2026`
- Search demo: `ArkaNusa Demo`, `0800 0000 0901`, `arkanusa.demo`, atau `ArkaDemo#VLRFY`

Untuk melanjutkan setelah mesin/session baru:

```powershell
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Catatan source of truth

Master Build Prompt VLRFY 65 bagian yang diberikan di percakapan adalah source of truth produk, tetapi belum disalin verbatim ke repository karena ukurannya sangat panjang. Session baru harus menerima prompt tersebut lagi atau membaca salinan verbatim yang ditambahkan pengguna. Dokumen ini, `product-rules.md`, `risk-methodology.md`, `moderation.md`, dan `architecture.md` adalah handoff implementasi—bukan pengganti lengkap master spec.
