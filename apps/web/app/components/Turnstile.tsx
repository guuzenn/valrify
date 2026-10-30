"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }

export function Turnstile({ action, resetKey, onToken }: { action: "register" | "forgot-password" | "resend-verification" | "submit-report" | "contact"; resetKey: number; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [size, setSize] = useState<"compact" | "flexible">();
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const resize = () => setSize(element.clientWidth >= 300 ? "flexible" : "compact");
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!ready || !sitekey || !size || !container.current || !window.turnstile) return;
    let active = true;
    onToken(""); setError("");
    const api = window.turnstile;
    const id = api.render(container.current, {
      sitekey, action, size, theme: "light", "response-field": false,
      callback: (token: string) => { if (active) { onToken(token); setError(""); } },
      "expired-callback": () => { if (active) onToken(""); },
      "timeout-callback": () => { if (active) onToken(""); },
      "error-callback": () => { if (active) { onToken(""); setError("Verifikasi keamanan gagal dimuat. Periksa koneksi atau muat ulang halaman."); } },
    });
    return () => { active = false; api.remove(id); };
  }, [ready, sitekey, size, action, resetKey, onToken]);

  if (!sitekey) return <p className="form-error" role="alert">Verifikasi keamanan belum tersedia. Coba lagi nanti.</p>;
  return <div className="turnstile-field">
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setReady(true)} onError={() => { onToken(""); setError("Verifikasi keamanan gagal dimuat. Periksa koneksi atau muat ulang halaman."); }}/>
    <div ref={container}/>
    {error&&<p className="form-error" role="alert">{error}</p>}
  </div>;
}
