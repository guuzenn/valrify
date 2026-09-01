"use client";

import Link from "next/link";
import { useState } from "react";
import { browserApi } from "../../lib/browser-api";
import { Footer, Header } from "../components/SiteChrome";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true); setMessage(""); setError("");
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    try {
      const result = await browserApi<{ message: string; developmentResetToken?: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      if (result.developmentResetToken) { window.location.assign(`/reset-password?token=${encodeURIComponent(result.developmentResetToken)}`); return; }
      setMessage(result.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Permintaan reset gagal.");
    } finally { setSending(false); }
  }

  return <><Header compact/><main className="page shell narrow auth-flow-page">
    <p className="eyebrow">// KEAMANAN AKUN</p><h1 className="page-title">LUPA PASSWORD.</h1>
    <p className="page-intro">Masukkan email akunmu. Jika terdaftar, kami akan mengirim tautan yang berlaku selama satu jam.</p>
    <form className="auth-card auth-flow-card" onSubmit={submit}><label>Email<input type="email" name="email" required autoComplete="email"/></label><button className="tactical-button" disabled={sending}>{sending ? "MENGIRIM..." : "KIRIM TAUTAN RESET"}</button><Link className="auth-text-link" href="/login">Kembali ke halaman masuk</Link></form>
    {message&&<p className="success-message" role="status">{message}</p>}{error&&<p className="form-error" role="alert">{error}</p>}
  </main><Footer/></>;
}
