import type { Metadata } from "next";
import Link from "next/link";
import Form from "next/form";
import { notFound } from "next/navigation";
import { publicReportsQuerySchema } from "@valrify/validation";
import { getReportDirectory } from "../../lib/api";
import { ArrowIcon } from "../components/ArrowIcon";
import { ReportCard } from "../components/ReportCard";
import { Disclaimer, Footer, Header } from "../components/SiteChrome";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Daftar laporan", description: "Telusuri laporan transaksi yang sudah ditampilkan di Valrify." };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ page?: string | string[]; q?: string | string[] }> }) {
  const parsed = publicReportsQuerySchema.safeParse(await searchParams);
  if (!parsed.success) notFound();
  const { page, q } = parsed.data;
  const pageHref = (number: number) => { const params = new URLSearchParams(); if (q) params.set("q", q); if (number > 1) params.set("page", String(number)); return `/laporan${params.size ? `?${params}` : ""}`; };
  const result = await getReportDirectory(page, q);
  if (result && page > 1 && !result.items.length) notFound();

  return <><Header compact backLabel="Kembali ke beranda"/><main className="page shell reports-page">
    <p className="section-label eyebrow">// LAPORAN KOMUNITAS</p><h1 className="page-title">Daftar laporan</h1>
    <p className="page-intro">Laporan yang sudah ditampilkan, dari yang terbaru. Untuk mengecek nomor atau akun tertentu, gunakan <Link href="/search">pencarian</Link>.</p>
    <Form action="/laporan" className="report-directory-search" key={q}><label htmlFor="report-query">Cari laporan</label><div><input id="report-query" name="q" defaultValue={q} maxLength={100} placeholder="Cari nama atau judul laporan" type="search"/><button className="tactical-button" type="submit">Cari laporan <ArrowIcon/></button></div>{q && <p>Hasil untuk <strong>“{q}”</strong> · <Link href="/laporan">Hapus pencarian</Link></p>}</Form>
    {!result ? <section className="data-panel" role="alert"><h2>Laporan belum bisa dimuat.</h2><p>Coba lagi sebentar. Gagal memuat data bukan berarti tidak ada laporan.</p><a className="button-secondary" href={pageHref(page)}>Coba lagi</a></section> : !result.items.length ? <section className="data-panel"><h2>{q ? `Tidak ada laporan yang cocok dengan “${q}”.` : "Belum ada laporan yang ditampilkan."}</h2>{q && <Link href="/laporan">Lihat semua laporan</Link>}<p>Hasil kosong bukan jaminan transaksi aman. Tetap periksa nomor, akun, dan bukti sebelum transfer.</p><Link href="/cara-aman">Baca panduan transaksi <ArrowIcon/></Link></section> : <>
      <p className="reports-page-count">Halaman {page} · {result.items.length} laporan</p>
      <div className="report-grid" aria-label="Daftar laporan">{result.items.map(report => <ReportCard report={report} key={report.publicId}/>)}</div>
      {(page > 1 || result.hasNext) && <nav className="reports-pagination" aria-label="Halaman daftar laporan">
        {page > 1 ? <Link href={pageHref(page - 1)} rel="prev"><ArrowIcon direction="left"/> Sebelumnya</Link> : <span/>}
        <span aria-current="page">Halaman {page}</span>
        {result.hasNext ? <Link href={pageHref(page + 1)} rel="next">Berikutnya <ArrowIcon direction="right"/></Link> : <span/>}
      </nav>}
    </>}
    <Disclaimer/>
  </main><Footer/></>;
}
