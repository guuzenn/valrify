"use client";

import Link from "next/link";
import { AdminPageHeader } from "../../components/AdminUi";
import { SessionSettings } from "../../components/SessionSettings";

export default function AdminSecurityPage() {
  return <main className="operations-page"><AdminPageHeader label="Keamanan akses" title="AKUN & SESI." description="Akses panel dilindungi MFA. Periksa sesi login dan akhiri akses dari perangkat yang tidak kamu kenali."/><section className="operations-security-grid"><article className="operations-card"><p className="section-label eyebrow">// AUTHENTICATOR</p><h2>MFA AKTIF.</h2><p>Akun admin dan moderator wajib melewati password dan authenticator sebelum membuka panel. Sesi akses panel berlaku dua jam.</p><p>Simpan recovery code di tempat privat. Code pemulihan hanya dapat dipakai satu kali.</p></article><article className="operations-card"><p className="section-label eyebrow">// AKUN PRIBADI</p><h2>PROFIL & PASSWORD.</h2><p>Kelola profil di Akun Saya. Gunakan alur reset password bila perlu mengganti password; reset akan mengakhiri seluruh sesi akun.</p><div className="operations-quick-links"><Link href="/account">BUKA AKUN SAYA</Link><Link href="/forgot-password">RESET PASSWORD</Link></div></article></section><SessionSettings/></main>;
}
