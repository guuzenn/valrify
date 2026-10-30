"use client";

import { useState } from "react";
import { browserApi, browserApiUrl, notifyAuthSessionChanged } from "../../lib/browser-api";
import { TaskDialog } from "./TaskDialog";

type ReportUser = { displayName: string; role: string };

export function ReportLoginDialog({ onClose, onSignedIn }: { onClose: () => void; onSignedIn: (user: ReportUser) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function checkSession() {
    setBusy(true); setError("");
    try {
      const { user } = await browserApi<{ user: ReportUser | null }>("/auth/me");
      if (!user) throw new Error("Kamu belum masuk. Selesaikan login di tab lain, lalu coba lagi.");
      onSignedIn(user); notifyAuthSessionChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sesi belum bisa diperiksa."); }
    finally { setBusy(false); }
  }
  return <TaskDialog open onClose={onClose} dismissOnBackdrop={false} title="Masuk (opsional)">
    <p>Masuk agar laporan tersimpan di riwayat akun. Kamu juga bisa menutup dialog ini dan melapor tanpa akun. Isian dan file bukti tetap ada selama tab form terbuka.</p>
    <form className="report-login-form" onSubmit={async event => {
      event.preventDefault(); if (busy) return;
      setBusy(true); setError("");
      const data = Object.fromEntries(new FormData(event.currentTarget));
      try {
        const { user } = await browserApi<{ user: ReportUser }>("/auth/login", { method: "POST", body: JSON.stringify(data) });
        onSignedIn(user); notifyAuthSessionChanged();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal masuk."); }
      finally { setBusy(false); }
    }}>
      <label>Email<input type="email" name="email" required autoComplete="email"/></label>
      <label>Password<input type="password" name="password" required autoComplete="current-password"/></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="tactical-button" disabled={busy}>{busy ? "Memproses..." : "Masuk dan kembali ke form"}</button>
    </form>
    <div className="report-login-alternatives">
      <a className="button-secondary" href={`${browserApiUrl}/auth/google`} target="_blank" rel="noopener noreferrer">Masuk dengan Google di tab baru</a>
      <div><a href="/register" target="_blank" rel="noopener noreferrer">Buat akun</a><a href="/forgot-password" target="_blank" rel="noopener noreferrer">Lupa password?</a><a href="/verify-email" target="_blank" rel="noopener noreferrer">Verifikasi email</a><a href="/login" target="_blank" rel="noopener noreferrer">Pilihan login lainnya</a></div>
      <p>Sudah selesai di tab lain? Kembali ke sini tanpa menutup atau memuat ulang tab form.</p>
      <button className="button-secondary" type="button" disabled={busy} onClick={() => void checkSession()}>Saya sudah masuk, cek lagi</button>
    </div>
  </TaskDialog>;
}
