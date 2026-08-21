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

Google OAuth produksi, reset password, dispute penuh, claim profile, verified middleman workflow, notification/email delivery, Redis, S3/R2, graph intelligence, fuzzy duplicate merge, analytics, dan deployment/domain produksi.

## Status handoff

Phase 1 dan vertical slice minimum telah selesai pada commit `9b2b1c6`. Master spec verbatim telah ditambahkan pada commit `555b19c`.

Vertical slice awal Phase 5 untuk konfirmasi transaksi berhasil juga telah dibangun:

`login → kirim konfirmasi → review admin → approve/reject → tampil di search/profil`

Implementasi mencakup bukti privat opsional, pembatasan duplikasi user/entity/tanggal, moderation action, larangan self-review moderator, dan pemisahan metrik positif dari risk label.

Struktur aktif:

- `apps/web`: Next.js App Router dan desain publik VLRFY yang sudah disetujui.
- `apps/api`: NestJS REST API untuk auth, search, report submission, evidence privat, dan moderation.
- `packages/domain`: normalisasi, masking, risk rules, RBAC, dan report transitions.
- `packages/validation`: skema Zod bersama.
- PostgreSQL lokal: Docker Compose, port `5434`.

Flow yang sudah diuji:

`submit → review queue → publish → exact search → entity profile → public case`

Validasi terakhir: `pnpm lint`, `pnpm test`, dan `pnpm build` lulus. Smoke test API konfirmasi menghasilkan alur `PENDING → APPROVED → public`, kemudian data uji dibersihkan. Endpoint admin menghasilkan 401 untuk publik. Pemeriksaan visual browser masih perlu dilakukan saat browser lokal tersedia.

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

Master Build Prompt VLRFY telah disalin verbatim ke `docs/master-spec.md` dan merupakan source of truth produk. Dokumen ini, `product-rules.md`, `risk-methodology.md`, `moderation.md`, dan `architecture.md` adalah handoff implementasi—bukan pengganti master spec.
