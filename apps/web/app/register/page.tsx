"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Footer, Header } from "../components/SiteChrome";
import { browserApi } from "../../lib/browser-api";
import { Turnstile } from "../components/Turnstile";

export default function RegisterPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);

  useEffect(() => {
    browserApi<{ user: { role: string } }>("/auth/me")
      .then(({ user }) => router.replace(user.role === "ADMIN" || user.role === "MODERATOR" ? "/admin/reports" : "/account"))
      .catch(() => setChecking(false));
  }, [router]);

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!turnstileToken || sending) return;
    setError(""); setMessage(""); setSending(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await browserApi<{ developmentVerificationToken?: string; message: string }>("/auth/register", { method: "POST", body: JSON.stringify({ ...data, turnstileToken }) });
      if (result.developmentVerificationToken) {
        await browserApi("/auth/verify-email", { method: "POST", body: JSON.stringify({ token: result.developmentVerificationToken }) });
        setMessage("Akun sudah aktif. Silakan masuk.");
      } else {
        setMessage(result.message);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pendaftaran gagal.");
    } finally { setSending(false); setTurnstileToken(""); setCaptchaReset(value => value + 1); }
  }

  return <><Header compact/><main className="page shell narrow auth-flow-page">
    <p className="eyebrow">// AKUN VALRIFY</p><h1 className="page-title">BUAT AKUN BARU.</h1>
    {checking ? <div className="actor-bar auth-loading">MEMERIKSA AKUN...</div> : <form className="auth-card auth-flow-card" onSubmit={register}>
      <p className="panel-index">// DAFTAR</p><h2>MULAI KONTRIBUSIMU.</h2>
      <label>Username<input name="username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" autoComplete="username" autoCapitalize="none" spellCheck={false} aria-describedby="username-help"/></label>
      <small id="username-help" className="field-note">3–24 karakter: huruf, angka, atau underscore. Profilmu tersedia di /u/username.</small>
      <label>Email<input type="email" name="email" required autoComplete="email"/></label>
      <label>Password<input type="password" name="password" required minLength={10} autoComplete="new-password"/></label>
      <Turnstile action="register" resetKey={captchaReset} onToken={setTurnstileToken}/>
      <button className="tactical-button" disabled={sending || !turnstileToken}>{sending ? "MENDAFTARKAN..." : "BUAT AKUN"}</button>
      <a className="button-secondary google-sign-in" href="/api/auth/google"><img src="/google.svg" width={20} height={20} alt=""/>Lanjutkan dengan Google</a>
      <Link className="auth-text-link" href="/login">Sudah punya akun? Masuk</Link>
      <Link className="auth-text-link" href="/verify-email">Belum menerima email verifikasi?</Link>
    </form>}
    {message&&<p className="success-message" role="status">{message}</p>}
    {error&&<p className="form-error" role="alert">{error}</p>}
  </main><Footer/></>;
}
