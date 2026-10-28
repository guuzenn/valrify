"use client";

import { useEffect, useRef, type ReactNode } from "react";

export const adminRoleLabels: Record<string, string> = { USER: "Pengguna", VERIFIED_MIDDLEMAN: "Rekber terverifikasi", MODERATOR: "Moderator", ADMIN: "Admin" };
export const adminRoleDescriptions: Record<string, string> = { USER: "Mengirim laporan untuk diperiksa admin.", VERIFIED_MIDDLEMAN: "Mengelola dan menerbitkan laporan yang diunggahnya sendiri. Tidak mendapat akses panel admin.", MODERATOR: "Memeriksa laporan akun lain dan moderasi Community. Login menggunakan MFA.", ADMIN: "Mengelola seluruh laporan, pengguna, role, dan direktori rekber. Login menggunakan MFA." };
export const adminActionLabels: Record<string, string> = { USER_ROLE_CHANGED: "Role pengguna diubah", DIRECTORY_CREATED: "Rekber ditambahkan", DIRECTORY_UPDATED: "Direktori rekber diubah", REPORT_PUBLISHED: "Laporan diterbitkan", REPORT_REJECTED: "Laporan ditolak", REPORT_WITHDRAWN: "Laporan ditarik", REPORT_EDITED: "Laporan dikoreksi", COMMUNITY_POST_REMOVED: "Post dihapus", COMMUNITY_REPORTS_DISMISSED: "Laporan post ditutup", COMMUNITY_COMMENT_REMOVED: "Komentar dihapus", COMMUNITY_COMMENT_REPORTS_DISMISSED: "Laporan komentar ditutup" };
export const adminDate = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));

export function AdminPageHeader({ label, title, description, children }: { label: string; title: string; description: string; children?: ReactNode }) {
  return <header className="operations-page-header"><div><p className="eyebrow">// {label}</p><h1>{title}</h1><p>{description}</p></div>{children && <div className="operations-header-actions">{children}</div>}</header>;
}

export function AdminFeedback({ message, error = true }: { message: string; error?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (message && error) { ref.current?.focus({ preventScroll: true }); ref.current?.scrollIntoView({ block: "center" }); } }, [message, error]);
  return message ? <div className={`operations-feedback ${error ? "error" : "success"}`} role={error ? "alert" : "status"} tabIndex={-1} ref={ref}>{message}</div> : null;
}

export function AdminPagination({ page, total, pageSize = 25, disabled = false, onPage }: { page: number; total: number; pageSize?: number; disabled?: boolean; onPage: (page: number) => void }) {
  return <nav className="operations-pagination" aria-label="Halaman data"><span>{total} item · Halaman {page} dari {Math.max(1, Math.ceil(total / pageSize))}</span><div><button type="button" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>SEBELUMNYA</button><button type="button" disabled={disabled || page * pageSize >= total} onClick={() => onPage(page + 1)}>BERIKUTNYA</button></div></nav>;
}
