"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { browserApi, notifyAuthSessionChanged } from "../../lib/browser-api";

type Setup = { secret: string; qrCode: string };
type Step = "password" | "code" | "setup" | "recovery-codes";

export function AdminLoginForm({ entry }: { entry: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("password");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const base = `/auth/admin/${entry}`;

  useEffect(() => {
    browserApi<{ user: { role: string } }>("/auth/me").then(({ user }) => {
      if (user.role === "ADMIN" || user.role === "MODERATOR") router.replace("/admin/reports");
    }).catch(() => {});
  }, [router]);

  function enterPanel() {
    notifyAuthSessionChanged();
    router.replace("/admin/reports");
    router.refresh();
  }

  async function loadSetup() {
    setStep("setup");
    setSetup(await browserApi<Setup>(`${base}/setup`));
  }

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await browserApi<{ enrollmentRequired: boolean }>(`${base}/login`, { method: "POST", body: JSON.stringify(body) });
      if (result.enrollmentRequired) await loadSetup();
      else setStep("code");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Login gagal."); }
    finally { setBusy(false); }
  }

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    const form = event.currentTarget;
    const code = String(new FormData(form).get("code") ?? "");
    try {
      const result = await browserApi<{ enrollmentRequired?: boolean; recoveryCodes?: string[] }>(`${base}/verify`, { method: "POST", body: JSON.stringify({ code }) });
      form.reset();
      if (result.enrollmentRequired) { setRecovery(false); await loadSetup(); }
      else if (result.recoveryCodes) { setSetup(null); setCodes(result.recoveryCodes); setStep("recovery-codes"); }
      else enterPanel();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Verifikasi gagal."); }
    finally { setBusy(false); }
  }

  function startOver() {
    setStep("password"); setSetup(null); setRecovery(false); setError("");
  }

  return <section className="auth-card auth-flow-card admin-login-card" aria-live="polite">
    {step === "password" ? <form onSubmit={login}>
      <p className="panel-index">// LOGIN ADMIN</p><h2>PASSWORD, LALU AUTHENTICATOR.</h2>
      <p>Akses admin dan moderator memakai password serta verifikasi dua langkah.</p>
      <label>Email<input type="email" name="email" autoComplete="username" required/></label>
      <label>Password<input type="password" name="password" autoComplete="current-password" required/></label>
      <button className="tactical-button" disabled={busy}>{busy ? "MEMERIKSA..." : "LANJUTKAN"}</button>
      <Link className="auth-text-link" href="/forgot-password">Lupa password?</Link>
    </form> : step === "recovery-codes" ? <div className="mfa-recovery">
      <p className="panel-index">// MFA AKTIF</p><h2>SIMPAN RECOVERY CODE.</h2>
      <p>Kode ini hanya ditampilkan sekali. Simpan di password manager. Setiap kode hanya bisa digunakan sekali bersama password untuk memasang authenticator baru jika HP hilang.</p>
      <p>Memasang authenticator baru mengganti seluruh recovery code lama. Jangan bagikan kode ini.</p>
      <pre aria-label="Recovery codes">{codes.join("\n")}</pre>
      <label className="mfa-saved"><input type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)}/>Saya sudah menyimpan recovery code di tempat aman.</label>
      <button className="tactical-button" disabled={!saved} onClick={enterPanel}>BUKA PANEL ADMIN</button>
    </div> : <form key={`${step}-${recovery}`} onSubmit={verify}>
      <p className="panel-index">// VERIFIKASI DUA LANGKAH</p>
      <h2>{step === "setup" ? "PASANG AUTHENTICATOR." : recovery ? "GUNAKAN RECOVERY CODE." : "MASUKKAN KODE."}</h2>
      {step === "setup" ? setup ? <>
        <p>Scan QR dengan aplikasi authenticator di HP. Jika tidak bisa scan, masukkan setup key secara manual.</p>
        <img className="mfa-qr" src={setup.qrCode} alt="QR untuk memasang authenticator Valrify" width={240} height={240}/>
        <label>Setup key<input value={setup.secret} readOnly spellCheck={false} autoComplete="off"/></label>
        <p>Jangan bagikan QR atau setup key. Keduanya memberi akses ke kode authenticator kamu.</p>
      </> : <p>Menyiapkan authenticator. Jika gagal, mulai login kembali.</p> : <p>{recovery ? "Gunakan salah satu recovery code yang disimpan. Setelah diterima, kamu wajib memasang authenticator baru." : "Buka aplikasi authenticator dan masukkan kode Valrify. Gunakan kode baru jika kode sebelumnya sudah dipakai."}</p>}
      <label>{recovery ? "Recovery code" : "Kode authenticator"}<input name="code" type="text" inputMode={recovery ? "text" : "numeric"} autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} required minLength={recovery ? 32 : 6} maxLength={recovery ? 64 : 6} pattern={recovery ? undefined : "[0-9]{6}"}/></label>
      <button className="tactical-button" disabled={busy || (step === "setup" && !setup)}>{busy ? "MEMERIKSA..." : "VERIFIKASI"}</button>
      {step === "code" && <button className="auth-text-link" type="button" disabled={busy} onClick={() => { setRecovery(value => !value); setError(""); }}>{recovery ? "Gunakan kode authenticator" : "HP hilang? Gunakan recovery code"}</button>}
      <button className="auth-text-link" type="button" disabled={busy} onClick={startOver}>Mulai login kembali</button>
    </form>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
