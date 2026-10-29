"use client";

import { ArrowIcon } from "../components/ArrowIcon";


import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Footer, Header } from "../components/SiteChrome";
import { browserApi, notifyAuthSessionChanged } from "../../lib/browser-api";

type SessionUser = {
  email: string;
  displayName: string;
  role: string;
};

function roleLabel(role: string) {
  return ({ USER: "PENGGUNA", VERIFIED_MIDDLEMAN: "REKBER TERVERIFIKASI", MODERATOR: "MODERATOR", ADMIN: "ADMIN" } as Record<string, string>)[role] ?? role;
}

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const googleError = new URLSearchParams(window.location.search).get("google_error");
    if (googleError) {
      setError(googleError === "existing_account" ? "Email sudah terdaftar. Masuk dengan password akun Valrify kamu." : googleError === "unavailable" ? "Login Google belum tersedia. Gunakan email dan password." : "Login Google dibatalkan atau sesi berakhir. Silakan coba lagi.");
      window.history.replaceState(null, "", "/login");
    }
    browserApi<{ user: SessionUser }>("/auth/me")
      .then((result) => setUser(result.user))
      .catch(() => setUser(null));
  }, []);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await browserApi<{ user: SessionUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setUser(result.user);
      notifyAuthSessionChanged();
      router.push(
        result.user.role === "ADMIN" || result.user.role === "MODERATOR"
          ? "/admin/reports"
          : "/account",
      );
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal masuk.");
    }
  }

  async function logout() {
    setError("");
    try {
      await browserApi("/auth/logout", { method: "POST" });
      setUser(null);
      notifyAuthSessionChanged();
      setMessage("Sesi berakhir. Silakan masuk dengan akun lain.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal keluar.");
    }
  }

  return <><Header compact/><main className="page shell narrow auth-flow-page">
    <p className="section-label eyebrow">// AKUN VALRIFY</p>
    <h1 className="page-title">MASUK KE AKUN.</h1>
    {user===undefined?<div className="actor-bar auth-loading">MEMERIKSA AKUN...</div>:user?<section className="session-card">
      <p className="section-label panel-index">// KAMU SUDAH MASUK</p>
      <div className="session-identity"><div><span>MASUK SEBAGAI</span><h2>{user.displayName}</h2><p>{user.email}</p></div><strong>{roleLabel(user.role)}</strong></div>
      <p>Kalau mau memakai akun lain, keluar dari akun ini dulu.</p>
      <div className="session-actions">
        <button className="button-secondary" type="button" onClick={logout}>KELUAR</button>
        <Link className="tactical-button" href={user.role==="ADMIN"||user.role==="MODERATOR"?"/admin/reports":"/account"}>{user.role==="ADMIN"||user.role==="MODERATOR"?"BUKA HALAMAN ADMIN":"BUKA AKUN SAYA"} <ArrowIcon/></Link>
      </div>
    </section>:<form className="auth-card auth-flow-card" onSubmit={login}>
      <p className="section-label panel-index">// MASUK</p><h2>SELAMAT DATANG KEMBALI.</h2>
      <label>Email<input type="email" name="email" required autoComplete="email"/></label>
      <label>Password<input type="password" name="password" required autoComplete="current-password"/></label>
      <Link className="auth-text-link" href="/forgot-password">Lupa password?</Link>
      <button className="tactical-button">MASUK <ArrowIcon/></button>
      <a className="button-secondary google-sign-in" href="/api/auth/google"><img src="/google.svg" width={20} height={20} alt=""/>Lanjutkan dengan Google</a>
      <Link className="auth-text-link" href="/register">Belum punya akun? Daftar</Link>
      <Link className="auth-text-link" href="/verify-email">Belum menerima email verifikasi?</Link>
    </form>}
    {message&&<p className="success-message" role="status">{message}</p>}
    {error&&<p className="form-error" role="alert">{error}</p>}
  </main><Footer/></>;
}
