# VLRFY — Session Context

## Source of truth

`VLRFY v1 — Master Build Prompt` dari user pada 21 Agustus 2026 adalah sumber kebenaran produk. Bahasa publik adalah Bahasa Indonesia dan seluruh copy harus netral, berbasis bukti, serta tidak menyebut seseorang sebagai kriminal atau "scammer".

## Batas implementasi sesi ini

Hanya Phase 1 dan minimum end-to-end vertical slice: fondasi aplikasi/database/design system/auth/RBAC; entity + normalized identifier; search; report submission dengan evidence privat; admin review; dan halaman entity/case publik.

## Sengaja ditunda

Google/email-password app-owned auth, email verification, Discord OAuth, profile claim, dispute, successful transaction UI, verified-middleman dashboard, notification UI, duplicate suggestions, entity merge, graph analysis, donation, analytics, dan risk-rule editor. Tabel transaksi disiapkan tetapi alur reputasi positif belum dibuka.

## Keputusan runtime

Implementasi memakai satu full-stack React/Vinext app dengan Cloudflare D1 dan R2 agar slice dapat dijalankan serta di-host sebagai satu unit. Batas domain, tabel relasional, dan fungsi normalisasi dipisah agar migrasi ke Next.js + NestJS + PostgreSQL tetap mudah saat skala membutuhkannya.

Deployment memakai identity header/SIWC dari runtime dan RBAC server-side. `VLRFY_ADMIN_EMAILS` adalah bootstrap allowlist. Google dan email/password menjadi pekerjaan pasca-slice karena runtime Sites tidak menyediakan app-owned public OAuth dari starter.

## Definition of done

`submit → review → publish → search → view entity/case`. Report tidak tampil publik sebelum `PUBLISHED`; raw evidence hanya untuk moderator/admin.
