"use client";

import Link from "next/link";
import { useState } from "react";
import { browserApi } from "../../lib/browser-api";

export function ResetPasswordForm({ token }: { token: string }) {
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setError("");
    const data = new FormData(event.currentTarget); const password = String(data.get("password") ?? ""); const confirmation = String(data.get("confirmation") ?? "");
    if (password !== confirmation) { setError("Konfirmasi password tidak sama."); return; }
    setSaving(true);
    try { const result = await browserApi<{ message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }); setMessage(result.message); event.currentTarget.reset(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Password belum dapat diganti."); }
    finally { setSaving(false); }
  }
  if (!token) return <section className="auth-result-card danger"><h2>TAUTAN TIDAK LENGKAP.</h2><p>Buka kembali tautan yang dikirim ke emailmu atau minta tautan baru.</p><Link className="tactical-button" href="/forgot-password">MINTA TAUTAN BARU</Link></section>;
  return <>{!message&&<form className="auth-card auth-flow-card" onSubmit={submit}><label>Password baru<input type="password" name="password" required minLength={10} maxLength={128} autoComplete="new-password"/></label><label>Ulangi password baru<input type="password" name="confirmation" required minLength={10} maxLength={128} autoComplete="new-password"/></label><small className="field-note">Minimal 10 karakter.</small><button className="tactical-button" disabled={saving}>{saving ? "MENYIMPAN..." : "GANTI PASSWORD"}</button></form>}{message&&<section className="auth-result-card"><h2>PASSWORD DIGANTI.</h2><p>{message}</p><Link className="tactical-button" href="/login">MASUK KE AKUN</Link></section>}{error&&<p className="form-error" role="alert">{error}</p>}</>;
}
