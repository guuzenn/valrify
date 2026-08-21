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
- Admin demo: `admin@vlrfy.local`
- User tester: `tester@vlrfy.local`
- Password demo: `DemoPass!2026`
- Search demo: `ArkaNusa Demo`, `0800 0000 0901`, `arkanusa.demo`, atau `ArkaDemo#VLRFY`

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
- raw evidence, identitas pelapor, email akun, token, dan data autentikasi tetap privat;
- tampilkan konteks bahwa data berasal dari laporan yang sudah diperiksa admin, bukan putusan hukum;
- perbarui `docs/master-spec.md`, `product-rules.md`, `risk-methodology.md`, arsitektur, masking domain, API publik, SEO, dan test agar kebijakan baru konsisten;
- lakukan review risiko privasi, salah tuduh, koreksi data, dan proses dispute sebelum rilis produksi.

Master spec sudah diperbarui melalui bagian **67. Product Amendment — Published Scam Identifiers**. Kebijakan baru mengizinkan identifier terlapor tampil penuh hanya setelah laporan diterbitkan admin; masking tetap menjadi default untuk seluruh data yang belum memenuhi syarat publikasi. Implementasi kode belum dilakukan dan tidak boleh dibuat sebagai sakelar global yang mematikan masking.

## Catatan source of truth

Master Build Prompt VLRFY telah disalin verbatim ke `docs/master-spec.md` dan merupakan source of truth produk. Dokumen ini, `product-rules.md`, `risk-methodology.md`, `moderation.md`, dan `architecture.md` adalah handoff implementasi—bukan pengganti master spec.
