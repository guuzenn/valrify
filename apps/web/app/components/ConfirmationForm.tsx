"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserApi, browserApiUrl } from "../../lib/browser-api";

type User = { displayName: string; role: string };

export function ConfirmationForm({
  entityId,
  entityName,
  entitySlug,
}: {
  entityId: number;
  entityName: string;
  entitySlug: string;
}) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    submitted?: boolean;
  }>({ loading: false });

  useEffect(() => {
    browserApi<{ user: User }>("/auth/me")
      .then((value) => setUser(value.user))
      .catch(() => setUser(null));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true });
    try {
      const response = await fetch(`${browserApiUrl}/transaction-confirmations`, {
        method: "POST",
        body: new FormData(event.currentTarget),
        credentials: "include",
      });
      const result = (await response.json()) as { message?: string | string[] };
      if (!response.ok) {
        throw new Error(
          Array.isArray(result.message)
            ? result.message.join(", ")
            : result.message ?? "Testi gagal dikirim.",
        );
      }
      setState({ loading: false, submitted: true });
    } catch (error) {
      setState({
        loading: false,
        error:
          error instanceof Error ? error.message : "Testi gagal dikirim.",
      });
    }
  }

  if (user === undefined) {
    return <div className="actor-bar">MEMERIKSA AKUN...</div>;
  }
  if (!user) {
    return (
      <div className="empty-state">
        <span>AKUN</span>
        <h2>MASUK UNTUK KASIH TESTI.</h2>
        <p>
          Testi harus terhubung ke akunmu supaya tidak mudah dipalsukan atau
          dikirim berkali-kali.
        </p>
        <Link href="/login" className="tactical-button">
          MASUK / DAFTAR
        </Link>
      </div>
    );
  }
  if (state.submitted) {
    return (
      <div className="success-state">
        <p className="eyebrow">// TESTI TERKIRIM</p>
        <h2>SEDANG DICEK.</h2>
        <p>
          Testi akan muncul di profil setelah dicek dan disetujui moderator.
        </p>
        <Link className="tactical-button" href={`/entity/${entitySlug}`}>
          KEMBALI KE PROFIL
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="actor-bar">
        MASUK SEBAGAI <strong>{user.displayName}</strong>
        <span>{user.role}</span>
      </div>
      <form className="report-form" onSubmit={submit}>
        <input type="hidden" name="entityId" value={entityId} />
        <fieldset>
          <legend>01 / CERITAKAN TRANSAKSI</legend>
          <div className="confirmation-subject">
            <span>KAMU BERTRANSAKSI DENGAN</span>
            <strong>{entityName}</strong>
          </div>
          <div className="form-grid">
            <label>
              Tanggal transaksi
              <input type="date" name="transactionDate" required />
            </label>
            <label>
              Nilai transaksi (Rp)
              <input
                type="number"
                name="amount"
                min="0"
                max="1000000000"
                step="1000"
                defaultValue="0"
                required
              />
            </label>
          </div>
          <label>
            Pengalaman kamu
            <textarea
              name="note"
              rows={5}
              minLength={10}
              maxLength={500}
              required
              placeholder="Contoh: Beli akun lewat rekber, proses lancar dan akun sudah saya terima sesuai kesepakatan. Jangan tulis data pribadi."
            />
          </label>
        </fieldset>
        <fieldset>
          <legend>02 / BUKTI OPSIONAL</legend>
          <label>
            Unggah bukti
            <input
              type="file"
              name="proof"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              multiple
            />
          </label>
          <p className="field-note">
            Maks. 3 file, 5 MB per file. Bukti bersifat privat dan hanya dapat
            dilihat moderator/admin.
          </p>
        </fieldset>
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        <button className="tactical-button" disabled={state.loading}>
          {state.loading ? "MENGIRIM..." : "KIRIM TESTI ↗"}
        </button>
      </form>
    </>
  );
}
