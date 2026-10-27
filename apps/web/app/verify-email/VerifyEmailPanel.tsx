"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { browserApi } from "../../lib/browser-api";
import { Turnstile } from "../components/Turnstile";

export function VerifyEmailPanel({ token }: { token: string }) {
  const [turnstileToken, setTurnstileToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [sending, setSending] = useState(false);
  const started = useRef(false); const [state, setState] = useState<"loading"|"success"|"error">(token ? "loading" : "error"); const [message, setMessage] = useState(token ? "Memeriksa tautan verifikasi..." : "Tautan verifikasi tidak lengkap."); const [resendMessage, setResendMessage] = useState("");
  useEffect(() => { if (!token || started.current) return; started.current = true; browserApi<{ message: string }>("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }).then((result) => { setState("success"); setMessage(result.message); }).catch((reason) => { setState("error"); setMessage(reason instanceof Error ? reason.message : "Email belum dapat diverifikasi."); }); }, [token]);
  async function resend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!turnstileToken || sending) return;
    setSending(true); setResendMessage("");
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    try { const result = await browserApi<{ message: string; developmentVerificationToken?: string }>("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email, turnstileToken }) }); if (result.developmentVerificationToken) { window.location.assign(`/verify-email?token=${encodeURIComponent(result.developmentVerificationToken)}`); return; } setResendMessage(result.message); }
    catch (reason) { setResendMessage(reason instanceof Error ? reason.message : "Email belum dapat dikirim ulang."); }
    finally { setSending(false); setTurnstileToken(""); setCaptchaReset(value => value + 1); }
  }
  return <section className={`auth-result-card ${state === "error" ? "danger" : ""}`}><h2>{state === "loading" ? "MEMERIKSA..." : state === "success" ? "EMAIL TERVERIFIKASI." : "TAUTAN BERMASALAH."}</h2><p>{message}</p>{state === "success" ? <Link className="tactical-button" href="/login">MASUK KE AKUN</Link> : state === "error" ? <form className="auth-resend-form" onSubmit={resend}><label>Email<input type="email" name="email" required autoComplete="email"/></label><Turnstile action="resend-verification" resetKey={captchaReset} onToken={setTurnstileToken}/><button className="button-secondary" disabled={sending || !turnstileToken}>{sending ? "MENGIRIM..." : "KIRIM ULANG VERIFIKASI"}</button>{resendMessage&&<small role="status">{resendMessage}</small>}</form> : null}</section>;
}
