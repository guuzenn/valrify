"use client";

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

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
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
          : "/submit",
      );
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal masuk.");
    }
  }

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await browserApi<{
        developmentVerificationToken?: string;
        message: string;
      }>("/auth/register", { method: "POST", body: JSON.stringify(data) });
      if (result.developmentVerificationToken) {
        await browserApi("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token: result.developmentVerificationToken }),
        });
        setMessage("Akun development terverifikasi. Silakan masuk.");
      } else {
        setMessage(result.message);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pendaftaran gagal.");
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

  return <><Header compact/><main className="page shell">
    <p className="eyebrow">// AKUN VLRFY</p>
    <h1 className="page-title">MASUK. VERIFIKASI. BERKONTRIBUSI.</h1>
    {user===undefined?<div className="actor-bar auth-loading">MEMERIKSA SESI...</div>:user?<section className="session-card">
      <p className="panel-index">// SESI AKTIF</p>
      <div className="session-identity"><div><span>MASUK SEBAGAI</span><h2>{user.displayName}</h2><p>{user.email}</p></div><strong>{user.role}</strong></div>
      <p>Selesaikan sesi ini sebelum masuk menggunakan akun lain.</p>
      <div className="session-actions">
        <button className="button-secondary" type="button" onClick={logout}>KELUAR</button>
        <Link className="tactical-button" href={user.role==="ADMIN"||user.role==="MODERATOR"?"/admin/reports":"/submit"}>{user.role==="ADMIN"||user.role==="MODERATOR"?"BUKA MODERATION":"KIRIM LAPORAN"} ↗</Link>
      </div>
    </section>:<div className="auth-grid">
      <form className="auth-card" onSubmit={login}><p className="panel-index">01 / MASUK</p><h2>AKUN TERDAFTAR</h2><label>Email<input type="email" name="email" required/></label><label>Password<input type="password" name="password" required/></label><button className="tactical-button">MASUK ↗</button></form>
      <form className="auth-card" onSubmit={register}><p className="panel-index">02 / DAFTAR</p><h2>AKUN BARU</h2><label>Nama tampilan<input name="displayName" required minLength={2}/></label><label>Email<input type="email" name="email" required/></label><label>Password<input type="password" name="password" required minLength={10}/></label><button className="button-secondary">BUAT AKUN</button></form>
    </div>}
    {message&&<p className="success-message" role="status">{message}</p>}
    {error&&<p className="form-error" role="alert">{error}</p>}
  </main><Footer/></>;
}
