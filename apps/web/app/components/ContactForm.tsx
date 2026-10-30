"use client";

import { useState, type FormEvent } from "react";
import { browserApi } from "../../lib/browser-api";
import { Turnstile } from "./Turnstile";
import { Select } from "./Select";

export function ContactForm() {
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("Saran & pertanyaan");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true); setError("");
    try {
      await browserApi("/contact", { method: "POST", body: JSON.stringify({
        name: fields.get("name"), email: fields.get("email"), topic,
        message: fields.get("message"), turnstileToken: token,
      }) });
      setSent(true);
      form.reset();
      setTopic("Saran & pertanyaan");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Pesan belum terkirim. Coba lagi nanti.");
    } finally {
      setBusy(false); setToken(""); setResetKey(key => key + 1);
    }
  }

  return <section id="pesan" className="contact-form-section" aria-labelledby="contact-form-title">
    <div><p className="section-label eyebrow">// PESAN UNTUK ADMIN</p><h2 id="contact-form-title">Kirim langsung di sini.</h2><p>Isi email yang bisa dihubungi agar admin dapat membalas. Pesan dan emailmu tidak ditampilkan ke publik.</p><p>Jangan sertakan kata sandi, kode verifikasi, atau data pribadi yang tidak diperlukan.</p></div>
    {sent ? <div className="contact-form-success" role="status"><h3>Pesan sudah terkirim.</h3><p>Terima kasih sudah menghubungi Valrify. Jika diperlukan, admin akan membalas ke email yang kamu isi.</p><button type="button" className="tactical-button" onClick={() => setSent(false)}>TULIS PESAN LAIN</button></div> : <form onSubmit={submit} className="contact-form" aria-busy={busy}>
      <fieldset disabled={busy}>
        <label htmlFor="contact-name">Nama<input id="contact-name" name="name" autoComplete="name" required maxLength={100}/></label>
        <label htmlFor="contact-email">Email untuk balasan<input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254}/></label>
        <label>Topik<Select label="Topik" value={topic} onValueChange={setTopic} disabled={busy}><option value="Saran & pertanyaan">Saran &amp; pertanyaan</option><option value="Koreksi laporan">Koreksi laporan</option><option value="Data pribadi">Data pribadi</option><option value="Masalah situs">Masalah situs</option></Select></label>
        <label htmlFor="contact-message">Pesan<textarea id="contact-message" name="message" required minLength={10} maxLength={5000} rows={7} aria-describedby="contact-message-help"/></label>
        <small id="contact-message-help">10–5.000 karakter. Untuk koreksi, sertakan tautan laporan yang dimaksud.</small>
        <Turnstile action="contact" resetKey={resetKey} onToken={setToken}/>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="tactical-button" disabled={!token || busy} type="submit">{busy ? "MENGIRIM..." : "KIRIM PESAN"}</button>
      </fieldset>
    </form>}
  </section>;
}
