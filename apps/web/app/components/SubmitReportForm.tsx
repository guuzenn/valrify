"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { browserApi, browserApiUrl } from "../../lib/browser-api";
import { CurrencyInput } from "./CurrencyInput";

type User = { displayName: string; role: string };
type IdentifierRow = { id: number; type: string; value: string; provider: string; relatedName: string; secondaryValue: string };

const types = [
  ["BANK_ACCOUNT", "Nomor rekening"],
  ["EWALLET", "E-wallet"],
  ["PHONE", "WhatsApp / telepon"],
  ["RIOT_ID", "Riot"],
  ["DISCORD", "Discord"],
  ["FACEBOOK_NAME", "Facebook"],
  ["PERSON_NAME", "Alias / nama asli"],
  ["OTHER", "Username lain"],
] as const;

const IndonesianBanks = [
  "BCA",
  "Bank Mandiri",
  "BRI",
  "BNI",
  "BSI",
  "CIMB Niaga",
  "PermataBank",
  "SeaBank",
  "Bank Jago",
  "blu by BCA Digital",
  "OCBC",
  "Bank Danamon",
] as const;

const IndonesianEwallets = ["DANA", "GoPay", "OVO", "ShopeePay", "LinkAja"] as const;

function SearchableProvider({ id, value, onChange, options, placeholder }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const filtered = options.filter((option) => option.toLocaleLowerCase("id-ID").includes(value.toLocaleLowerCase("id-ID")));

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return <div className="provider-combobox" ref={rootRef}>
    <input
      id={id}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls={`${id}-options`}
      aria-activedescendant={open && filtered[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
      value={value}
      onFocus={() => { setOpen(true); setActiveIndex(0); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
        if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0))); }
        if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
        if (event.key === "Enter" && open && filtered[activeIndex]) { event.preventDefault(); onChange(filtered[activeIndex]); setOpen(false); }
      }}
      onChange={(event) => { onChange(event.target.value); setActiveIndex(0); setOpen(true); }}
      placeholder={placeholder}
      maxLength={40}
      autoComplete="off"
    />
    <span className="provider-combobox-icon" aria-hidden="true">⌄</span>
    {open && <div className="provider-options" id={`${id}-options`} role="listbox">
      {filtered.length > 0 ? filtered.map((option, index) => <button
        id={`${id}-option-${index}`}
        type="button"
        role="option"
        aria-selected={index === activeIndex}
        key={option}
        onPointerEnter={() => setActiveIndex(index)}
        onClick={() => { onChange(option); setOpen(false); }}
      >{option}</button>) : <p>Tidak ada di daftar—nama yang kamu ketik tetap bisa dipakai.</p>}
    </div>}
  </div>;
}

function extraIdentifier(row: IdentifierRow) {
  const value = row.type === "BANK_ACCOUNT" || row.type === "EWALLET" ? row.relatedName : row.secondaryValue;
  if (!value.trim()) return null;
  if (row.type === "BANK_ACCOUNT") return { type: "BANK_ACCOUNT_NAME", value: value.trim(), provider: row.provider };
  if (row.type === "EWALLET") return { type: "EWALLET_ACCOUNT_NAME", value: value.trim(), provider: row.provider };
  if (row.type === "RIOT_ID") return { type: "RIOT_NICKNAME", value: value.trim(), provider: "Riot" };
  if (row.type === "FACEBOOK_NAME") return { type: "FACEBOOK_URL", value: value.trim(), provider: "Facebook" };
  return null;
}

function mainFieldLabel(type: string) {
  if (type === "BANK_ACCOUNT") return "Nomor rekening";
  if (type === "EWALLET") return "Nomor e-wallet";
  if (type === "PHONE") return "Nomor WhatsApp / telepon";
  if (type === "RIOT_ID") return "Username Riot";
  if (type === "FACEBOOK_NAME") return "Nama Facebook";
  if (type === "PERSON_NAME") return "Alias / nama asli";
  return "Username";
}

export function SubmitReportForm() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [state, setState] = useState<{ loading: boolean; error?: string; publicId?: string }>({ loading: false });
  const [nextIdentifierId, setNextIdentifierId] = useState(2);
  const [identifierRows, setIdentifierRows] = useState<IdentifierRow[]>([
    { id: 1, type: "BANK_ACCOUNT", value: "", provider: "", relatedName: "", secondaryValue: "" },
  ]);
  const submittedIdentifierCount = identifierRows.reduce(
    (total, row) => total + 1 + (extraIdentifier(row) ? 1 : 0),
    0,
  );

  useEffect(() => {
    browserApi<{ user: User }>("/auth/me")
      .then((value) => setUser(value.user))
      .catch(() => setUser(null));
  }, []);

  function updateIdentifier(id: number, patch: Partial<IdentifierRow>) {
    setIdentifierRows((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function addIdentifier() {
    if (submittedIdentifierCount >= 8) return;
    setIdentifierRows((rows) => [...rows, { id: nextIdentifierId, type: "BANK_ACCOUNT", value: "", provider: "", relatedName: "", secondaryValue: "" }]);
    setNextIdentifierId((value) => value + 1);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setState({ loading: true });
    try {
      const formData = new FormData(form);
      const entityName = String(formData.get("entityName") ?? "").trim();
      const title = String(formData.get("title") ?? "").trim();
      const chronology = String(formData.get("chronology") ?? "").trim();
      if (entityName.length < 2) throw new Error("Isi nama seller atau nama profil utama.");
      const emptyIdentifierIndex = identifierRows.findIndex((row) => row.value.trim().length < 2);
      if (emptyIdentifierIndex >= 0) throw new Error(`Lengkapi ${mainFieldLabel(identifierRows[emptyIdentifierIndex]!.type).toLowerCase()} pada data ${emptyIdentifierIndex + 1}.`);
      const missingProviderIndex = identifierRows.findIndex((row) => ["BANK_ACCOUNT", "EWALLET"].includes(row.type) && row.provider.trim().length < 2);
      if (missingProviderIndex >= 0) throw new Error(`Pilih atau ketik ${identifierRows[missingProviderIndex]!.type === "BANK_ACCOUNT" ? "nama bank" : "nama e-wallet"} pada data ${missingProviderIndex + 1}.`);
      if (title.length < 8) throw new Error("Isi judul masalah minimal 8 karakter.");
      if (chronology.length < 80) throw new Error("Ceritakan kejadian minimal 80 karakter agar moderator punya konteks yang cukup.");

      const submittedIdentifiers = identifierRows.flatMap((row) => {
        const extra = extraIdentifier(row);
        return [{ type: row.type, value: row.value.trim(), provider: row.provider.trim() }, ...(extra ? [extra] : [])];
      });
      if (submittedIdentifiers.length > 8) throw new Error("Maksimal 8 data termasuk nama atau link tambahan.");
      const invalidFacebook = identifierRows.find((row) => row.type === "FACEBOOK_NAME" && row.secondaryValue.trim() && !/^https?:\/\//i.test(row.secondaryValue.trim()));
      if (invalidFacebook) throw new Error("Link Facebook harus diawali http:// atau https://.");
      formData.set("identifiers", JSON.stringify(submittedIdentifiers));
      const evidenceUrl = String(formData.get("evidenceUrl") ?? "").trim();
      const evidenceFiles = formData.getAll("evidence").filter((value) => value instanceof File && value.size > 0);
      if (evidenceUrl && !/^https?:\/\//i.test(evidenceUrl)) throw new Error("Link posting bukti harus diawali http:// atau https://.");
      if (!evidenceUrl && evidenceFiles.length === 0) {
        throw new Error("Isi link posting bukti atau unggah minimal satu file.");
      }
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
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (user === undefined) return <div className="actor-bar">MEMERIKSA AKUN...</div>;
  if (!user) return <div className="empty-state"><span>AKUN</span><h2>MASUK UNTUK MELAPOR.</h2><p>Kamu perlu akun supaya laporan tidak mudah dipalsukan atau dikirim sebagai spam.</p><Link href="/login" className="tactical-button">MASUK / DAFTAR</Link></div>;
  if (state.publicId) return <div className="success-state"><p className="eyebrow">// SCAM REPORT TERKIRIM</p><h2>{state.publicId}</h2><p>Admin akan mengecek laporanmu. Laporan belum tampil untuk umum.</p><Link className="tactical-button" href="/">KEMBALI KE BERANDA</Link></div>;

  return <>
    <div className="actor-bar">MASUK SEBAGAI <strong>{user.displayName}</strong><span>{user.role}</span></div>
    <form className="report-form" onSubmit={submit} noValidate>
      {state.error && <p className="form-error form-error-banner" role="alert">{state.error}</p>}
      <fieldset>
        <legend>01 / SIAPA YANG DILAPORKAN?</legend>
        <label>Nama seller / nama profil utama<input name="entityName" required minLength={2} maxLength={80}/><small className="field-note">Pakai nama yang paling dikenal pembeli. Nama asli atau nama Facebook bisa ditambahkan sebagai alias di bawah.</small></label>
        <div className="identifier-builder">
          <div className="identifier-builder-heading"><div><strong>DATA YANG KAMU PUNYA</strong><p>Tambahkan semua nomor, rekening, atau akun yang dipakai orang ini. Kalau ada yang sudah dikenal Valrify, laporan akan masuk ke profil yang sama.</p></div><span>{submittedIdentifierCount}/8</span></div>
          {identifierRows.map((row, index) => <div className="identifier-entry" key={row.id}>
            <div className="form-grid">
              <label>Jenis data<select value={row.type} onChange={(event) => updateIdentifier(row.id, { type: event.target.value, provider: "", relatedName: "", secondaryValue: "" })}>{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>{mainFieldLabel(row.type)}<input value={row.value} inputMode={["BANK_ACCOUNT", "EWALLET", "PHONE"].includes(row.type) ? "numeric" : undefined} onChange={(event) => updateIdentifier(row.id, { value: event.target.value })} required minLength={2} maxLength={160}/></label>
            </div>
            {(row.type === "BANK_ACCOUNT" || row.type === "EWALLET") && <div className="form-grid composite-fields">
              <label>{row.type === "BANK_ACCOUNT" ? "Bank" : "E-wallet"}<SearchableProvider id={`provider-${row.id}`} value={row.provider} onChange={(provider) => updateIdentifier(row.id, { provider })} options={row.type === "BANK_ACCOUNT" ? IndonesianBanks : IndonesianEwallets} placeholder={row.type === "BANK_ACCOUNT" ? "Cari BCA, Mandiri, BRI..." : "Cari DANA, GoPay, OVO..."}/></label>
              <label>{row.type === "BANK_ACCOUNT" ? "Nama pemilik rekening (opsional)" : "Nama pemilik e-wallet (opsional)"}<input value={row.relatedName} onChange={(event) => updateIdentifier(row.id, { relatedName: event.target.value })} placeholder="Nama yang terlihat saat transfer" minLength={2} maxLength={160} disabled={submittedIdentifierCount >= 8 && !row.relatedName.trim()}/></label>
            </div>}
            {row.type === "RIOT_ID" && <div className="composite-fields"><label>Nickname / Riot ID (opsional)<input value={row.secondaryValue} onChange={(event) => updateIdentifier(row.id, { secondaryValue: event.target.value })} placeholder="Contoh: NamaGame#TAG" minLength={2} maxLength={160} disabled={submittedIdentifierCount >= 8 && !row.secondaryValue.trim()}/></label><small className="field-note">Jangan masukkan password, email login, atau kode OTP. Nickname bisa berubah, jadi sertakan rekening atau nomor lain jika tersedia.</small></div>}
            {row.type === "FACEBOOK_NAME" && <div className="composite-fields"><label>Link profil Facebook (opsional)<input type="url" value={row.secondaryValue} onChange={(event) => updateIdentifier(row.id, { secondaryValue: event.target.value })} placeholder="https://www.facebook.com/..." maxLength={160} disabled={submittedIdentifierCount >= 8 && !row.secondaryValue.trim()}/></label></div>}
            {row.type === "OTHER" && <label>Nama platform (opsional)<input value={row.provider} onChange={(event) => updateIdentifier(row.id, { provider: event.target.value })} placeholder="Contoh: Telegram, Instagram" maxLength={40}/></label>}
            {identifierRows.length > 1 && <div className="identifier-entry-footer"><span/><button type="button" className="remove-data-button" onClick={() => setIdentifierRows((rows) => rows.filter((item) => item.id !== row.id))}>HAPUS DATA {index + 1}</button></div>}
          </div>)}
          <button type="button" className="add-data-button" onClick={addIdentifier} disabled={submittedIdentifierCount >= 8}>+ TAMBAH NOMOR / AKUN LAIN</button>
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
        <legend>03 / SERTAKAN BUKTI (WAJIB)</legend>
        <label>Link posting bukti (Facebook atau sumber lain)<input type="url" name="evidenceUrl" placeholder="https://www.facebook.com/groups/.../posts/..." maxLength={500}/></label>
        <label>Screenshot chat / transfer / bukti lain<input type="file" name="evidence" accept="image/png,image/jpeg,image/webp,application/pdf" multiple/></label>
        <p className="field-note">Isi minimal salah satu: link posting atau upload file. Maks. 5 file, 5 MB per file. Upload hanya dapat dipublikasikan setelah admin memastikan gambar aman ditampilkan.</p>
      </fieldset>
      <button className="tactical-button" disabled={state.loading}>{state.loading ? "MENGIRIM..." : "KIRIM SCAM REPORT ↗"}</button>
    </form>
  </>;
}
