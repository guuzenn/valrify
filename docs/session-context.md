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
