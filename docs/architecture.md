# Architecture

VLRFY sesi pertama adalah modular full-stack app: route publik/dashboard di `app/`, aturan domain murni di `lib/domain.ts`, akses D1 di `lib/data.ts`, dan identity/RBAC di `lib/auth.ts`. D1 menyimpan data relasional; R2 menyimpan bytes evidence dan D1 hanya metadata.

Relasi inti: `User → Report → Identifier ← Entity`. Join table terpisah memastikan satu identifier dapat terhubung ke beberapa konteks tanpa array JSON.

Semua write endpoint menjalankan auth + authorization di server. Evidence tidak memiliki URL publik. Hanya report `PUBLISHED` yang dapat dibaca route publik.
