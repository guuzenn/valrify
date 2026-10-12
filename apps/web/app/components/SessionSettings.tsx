"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserApi, notifyAuthSessionChanged } from "../../lib/browser-api";

type Session = { id: string; createdAt: string; expiresAt: string; current: boolean };
const date = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function SessionSettings() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { browserApi<{ sessions: Session[] }>("/auth/sessions").then((data) => setSessions(data.sessions)).catch(() => setError("Gagal memuat sesi login.")); }, []);
  async function revoke(session: Session) {
    setBusy(session.id); setError("");
    try {
      await browserApi(`/auth/sessions/${session.id}`, { method: "DELETE" });
      if (session.current) { notifyAuthSessionChanged(); router.replace("/login"); router.refresh(); }
      else setSessions((rows) => rows.filter((row) => row.id !== session.id));
    } catch { setError("Gagal mengakhiri sesi. Coba kembali."); }
    finally { setBusy(null); }
  }
  return <section className="session-settings"><p className="eyebrow">// KEAMANAN AKUN</p><h2>SESI LOGIN.</h2><p>Akhiri sesi yang tidak kamu kenali. Reset password juga mengakhiri semua sesi. Sesi admin berlaku 2 jam; pengguna lain hingga 7 hari.</p>{error && <p role="alert">{error}</p>}<ul>{sessions.map((session) => <li key={session.id}><div><strong>{session.current ? "Sesi ini" : "Sesi lainnya"}</strong><p>Masuk {date(session.createdAt)} · Berakhir {date(session.expiresAt)}</p></div><button type="button" disabled={busy !== null} onClick={() => void revoke(session)}>{busy === session.id ? "Memproses..." : "Akhiri sesi"}</button></li>)}</ul></section>;
}
