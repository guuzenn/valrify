"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserApi } from "../../lib/browser-api";

type Receipt = { publicId: string; status: string; createdAt: string; moderatorNote: string | null };
const labels: Record<string, string> = { SUBMITTED: "Laporan diterima", UNDER_REVIEW: "Sedang diperiksa", NEEDS_INFO: "Butuh informasi tambahan", VERIFIED: "Siap ditampilkan", PUBLISHED: "Sudah ditampilkan", REJECTED: "Belum dapat ditampilkan", WITHDRAWN: "Laporan ditarik" };

export function GuestReportStatus() {
  const [token, setToken] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState(false);

  async function check(value: string) {
    setBusy(true); setError(""); setReceipt(null);
    try {
      if (!/^[a-f0-9]{64}$/.test(value)) throw new Error("Buka tautan pelacakan lengkap yang kamu simpan setelah mengirim laporan.");
      setReceipt(await browserApi<Receipt>("/reports/guest/status", { method: "POST", body: JSON.stringify({ token: value }) }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Status belum bisa diperiksa."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    const load = () => {
      const value = window.location.hash.slice(1);
      setToken(value); setClaimed(false); setReceipt(null); setError("");
      if (value) void check(value);
    };
    load();
    window.addEventListener("hashchange", load);
    return () => window.removeEventListener("hashchange", load);
  }, []);

  return <div className="guest-report-status">
    <p>Tautan ini privat. Jangan membagikannya atau mengirimkannya sebagai link laporan publik.</p>
    {!token && <p>Buka tautan lengkap yang kamu simpan setelah melapor. Nomor laporan saja tidak bisa membuka status privat.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {busy && <p role="status">Memeriksa...</p>}
    {claimed ? <div role="status"><p>Laporan sudah disimpan ke akunmu. Tautan pelacakan lama tidak berlaku lagi.</p><Link className="tactical-button" href="/account">Lihat riwayat akun</Link></div> : <>
      {receipt && <section className="data-panel" aria-live="polite"><p className="section-label">{receipt.publicId}</p><h2>{labels[receipt.status] ?? "Status diperbarui"}</h2><p>Dikirim {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(receipt.createdAt))}</p>{receipt.moderatorNote && <><h3>Catatan admin</h3><p className="guest-moderator-note">{receipt.moderatorNote}</p></>}{receipt.status === "NEEDS_INFO" && <p>Balas permintaan tambahan melalui <a href={`mailto:support@valrify.app?subject=${encodeURIComponent(`Tambahan bukti ${receipt.publicId}`)}`}>support@valrify.app</a>. Sertakan nomor laporan dan jelaskan informasi tambahannya. Jangan kirim password atau OTP. Admin akan memeriksa kecocokan bukti sebelum mengubah laporan.</p>}{receipt.status === "PUBLISHED" && <Link href={`/case/${receipt.publicId}`}>Buka laporan publik</Link>}</section>}
      {token && <button className="button-secondary" disabled={busy} onClick={() => { void check(token); }}>Periksa status lagi</button>}
      {receipt && <section><h2>Simpan di akun (opsional)</h2><p><Link href="/login" target="_blank" rel="noreferrer">Masuk</Link> atau <Link href="/register" target="_blank" rel="noreferrer">buat akun</Link> di tab lain, lalu kembali dan tekan tombol ini. Email akun harus sudah diverifikasi.</p><button className="tactical-button" disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        try { await browserApi("/reports/guest/claim", { method: "POST", body: JSON.stringify({ token }) }); setClaimed(true); window.history.replaceState(window.history.state, "", window.location.pathname); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "Laporan belum bisa disimpan ke akun."); }
        finally { setBusy(false); }
      }}>Simpan laporan ke akun</button></section>}
    </>}
  </div>;
}
