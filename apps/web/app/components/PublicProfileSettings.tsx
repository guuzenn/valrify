"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { browserApi } from "../../lib/browser-api";

type Props = {
  initialUsername: string | null;
  initialBio: string;
  initialUsernameCanChangeAt: string | null;
  onSaved: (profile: { username: string; bio: string; usernameCanChangeAt: string | null }) => void;
};

export function PublicProfileSettings({ initialUsername, initialBio, initialUsernameCanChangeAt, onSaved }: Props) {
  const [username, setUsername] = useState(initialUsername ?? "");
  const [bio, setBio] = useState(initialBio);
  const [savedUsername, setSavedUsername] = useState(initialUsername);
  const [usernameCanChangeAt, setUsernameCanChangeAt] = useState(initialUsernameCanChangeAt);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const profile = await browserApi<{ username: string; bio: string; usernameCanChangeAt: string | null }>("/account/profile", {
        method: "PATCH",
        body: JSON.stringify({ username, bio }),
      });
      setUsername(profile.username);
      setBio(profile.bio);
      setSavedUsername(profile.username);
      setUsernameCanChangeAt(profile.usernameCanChangeAt);
      onSaved(profile);
      setMessage("Profil publik berhasil disimpan.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Profil belum bisa disimpan.");
    } finally {
      setSaving(false);
    }
  }

  const usernameLocked = Boolean(usernameCanChangeAt && new Date(usernameCanChangeAt) > new Date());

  return <section className="account-public-profile">
    <div className="account-public-intro"><span>// PROFIL PUBLIK</span><h2>PROFIL YANG BISA DIBAGIKAN.</h2><p>Buat username supaya orang lain bisa membuka profilmu. Email, bukti, laporan yang masih diperiksa, dan catatan admin tidak ditampilkan.</p>{savedUsername && <Link href={`/u/${savedUsername}`}>LIHAT PROFIL PUBLIK →</Link>}</div>
    <form onSubmit={(event) => void submit(event)}>
      <label><span>USERNAME PUBLIK</span><div className="account-username-input"><b>@</b><input required disabled={usernameLocked} minLength={3} maxLength={24} pattern="[a-z0-9_]+" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="contoh: reyv_valo" autoComplete="username"/></div><small>{usernameLocked && usernameCanChangeAt ? `Bisa diganti lagi ${new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(usernameCanChangeAt))}. Bio tetap bisa diedit.` : "Setelah diganti, username tidak dapat diubah lagi selama 7 hari."}</small></label>
      <label><span>BIO SINGKAT</span><textarea maxLength={160} rows={3} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Ceritakan sedikit tentang dirimu."/><small>{bio.length}/160 karakter</small></label>
      {error && <p className="account-profile-message error">{error}</p>}
      {message && <p className="account-profile-message success">{message}</p>}
      <button type="submit" disabled={saving}>{saving ? "MENYIMPAN..." : savedUsername ? "SIMPAN PERUBAHAN" : "BUAT PROFIL PUBLIK"}</button>
    </form>
  </section>;
}
