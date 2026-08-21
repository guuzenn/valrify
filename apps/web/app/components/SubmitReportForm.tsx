"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserApi, browserApiUrl } from "../../lib/browser-api";
import { CurrencyInput } from "./CurrencyInput";

type User = { displayName: string; role: string };
type IdentifierRow = { id: number; type: string; value: string; provider: string };

const types = [
  ["PHONE", "WhatsApp / telepon"],
  ["BANK_ACCOUNT", "Nomor rekening"],
  ["EWALLET", "E-wallet"],
  ["DISCORD", "Discord"],
  ["FACEBOOK_NAME", "Nama Facebook"],
  ["FACEBOOK_URL", "URL Facebook"],
  ["RIOT_ID", "Riot ID"],
  ["PERSON_NAME", "Nama"],
  ["OTHER", "Username lain"],
] as const;

export function SubmitReportForm() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [state, setState] = useState<{ loading: boolean; error?: string; publicId?: string }>({ loading: false });
  const [nextIdentifierId, setNextIdentifierId] = useState(2);
  const [identifierRows, setIdentifierRows] = useState<IdentifierRow[]>([
    { id: 1, type: "PHONE", value: "", provider: "" },
  ]);

  useEffect(() => {
    browserApi<{ user: User }>("/auth/me")
      .then((value) => setUser(value.user))
      .catch(() => setUser(null));
  }, []);

  function updateIdentifier(id: number, patch: Partial<IdentifierRow>) {
    setIdentifierRows((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function addIdentifier() {
    if (identifierRows.length >= 8) return;
    setIdentifierRows((rows) => [...rows, { id: nextIdentifierId, type: "BANK_ACCOUNT", value: "", provider: "" }]);
    setNextIdentifierId((value) => value + 1);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true });
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("identifiers", JSON.stringify(identifierRows.map(({ type, value, provider }) => ({ type, value, provider }))));
      const response = await fetch(`${browserApiUrl}/reports`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const result = await response.json() as { message?: string | string[]; publicId?: string };
      if (!response.ok) {
        throw new Error(Array.isArray(result.message) ? result.message.join(", ") : result.message ?? "Laporan gagal dikirim.");
      }
      setState({ loading: false, publicId: result.publicId });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : "Laporan gagal dikirim." });
    }
  }

  if (user === undefined) return <div className="actor-bar">MEMERIKSA AKUN...</div>;
  if (!user) return <div className="empty-state"><span>AKUN</span><h2>MASUK UNTUK MELAPOR.</h2><p>Kamu perlu akun supaya laporan tidak mudah dipalsukan atau dikirim sebagai spam.</p><Link href="/login" className="tactical-button">MASUK / DAFTAR</Link></div>;
  if (state.publicId) return <div className="success-state"><p className="eyebrow">// LAPORAN TERKIRIM</p><h2>{state.publicId}</h2><p>Admin akan mengecek laporanmu. Laporan belum tampil untuk umum.</p><Link className="tactical-button" href="/">KEMBALI KE BERANDA</Link></div>;

  return <>
    <div className="actor-bar">MASUK SEBAGAI <strong>{user.displayName}</strong><span>{user.role}</span></div>
    <form className="report-form" onSubmit={submit}>
      <fieldset>
        <legend>01 / SIAPA YANG DILAPORKAN?</legend>
        <label>Nama akun / seller<input name="entityName" required minLength={2} maxLength={80}/></label>
        <div className="identifier-builder">
          <div className="identifier-builder-heading"><div><strong>DATA YANG KAMU PUNYA</strong><p>Tambahkan semua nomor, rekening, atau akun yang dipakai orang ini. Kalau ada yang sudah dikenal VLRFY, laporan akan masuk ke profil yang sama.</p></div><span>{identifierRows.length}/8</span></div>
          {identifierRows.map((row, index) => <div className="identifier-entry" key={row.id}>
            <div className="form-grid">
              <label>Jenis data<select value={row.type} onChange={(event) => updateIdentifier(row.id, { type: event.target.value })}>{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Nomor / username / link<input value={row.value} onChange={(event) => updateIdentifier(row.id, { value: event.target.value })} required minLength={2} maxLength={160}/></label>
            </div>
            <div className="identifier-entry-footer">
              <label>Nama bank atau platform (kalau ada)<input value={row.provider} onChange={(event) => updateIdentifier(row.id, { provider: event.target.value })} maxLength={40}/></label>
              {identifierRows.length > 1 && <button type="button" className="remove-data-button" onClick={() => setIdentifierRows((rows) => rows.filter((item) => item.id !== row.id))}>HAPUS DATA {index + 1}</button>}
            </div>
          </div>)}
          <button type="button" className="add-data-button" onClick={addIdentifier} disabled={identifierRows.length >= 8}>+ TAMBAH NOMOR / AKUN LAIN</button>
        </div>
      </fieldset>
      <fieldset>
        <legend>02 / CERITAKAN KEJADIANNYA</legend>
        <label>Masalahnya apa?<input name="title" required minLength={8} maxLength={120} placeholder="Contoh: Uang sudah ditransfer, akun tidak dikirim"/></label>
        <label>Ceritakan dari awal sampai akhir<textarea name="chronology" required minLength={80} maxLength={5000} rows={9} placeholder="Jelaskan kapan deal, apa yang dijanjikan, apa yang kamu kirim, dan masalah yang terjadi."/></label>
        <div className="form-grid"><label>Tanggal transaksi<input type="date" name="transactionDate"/></label><label>Uang yang hilang (Rp)<CurrencyInput name="allegedLoss"/></label></div>
        <label>Kamu sedang apa?<select name="transactionType"><option value="ACCOUNT_PURCHASE">Membeli akun</option><option value="ACCOUNT_SALE">Menjual akun</option><option value="ACCOUNT_TRADE">Tukar akun</option><option value="MIDDLEMAN">Pakai jasa rekber / middleman</option></select></label>
      </fieldset>
      <fieldset>
        <legend>03 / UPLOAD BUKTI (WAJIB)</legend>
        <label>Screenshot chat / transfer / bukti lain<input type="file" name="evidence" accept="image/png,image/jpeg,image/webp,application/pdf" multiple required/></label>
        <p className="field-note">Maks. 5 file, 5 MB per file. Bukti cuma bisa dilihat admin.</p>
      </fieldset>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="tactical-button" disabled={state.loading}>{state.loading ? "MENGIRIM..." : "KIRIM LAPORAN ↗"}</button>
    </form>
  </>;
}
