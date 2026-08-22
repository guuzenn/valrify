import Link from "next/link";
import { labelIdentifierType } from "@valrify/domain";
import { searchPublic } from "../../lib/api";
import { Disclaimer, Footer, Header } from "../components/SiteChrome";
import { RiskBadge } from "../components/RiskBadge";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const results = q ? await searchPublic(q) : [];
  return <><Header compact/><main className="page shell">
    <p className="eyebrow">// CEK SEBELUM TRANSAKSI</p><h1 className="page-title">CEK NOMOR ATAU AKUN.</h1>
    <form action="/search" className="page-search"><label className="sr-only" htmlFor="search-q">Masukkan nama, nomor, atau akun</label><input id="search-q" name="q" defaultValue={q} placeholder="Nama seller, alias, rekening, Discord, Facebook..." required/><button>CEK SEKARANG ↗</button></form>
    {q&&<section className="results"><p className="result-query">HASIL UNTUK <strong>“{q}”</strong></p>{results.length===0?<div className="empty-state"><span>00</span><h2>BELUM ADA CATATAN.</h2><p>Nomor atau akun ini belum ditemukan di Valrify. Bukan berarti pasti aman—tetap cek identitas dan pakai rekber kalau perlu.</p><Link href="/submit" className="tactical-button">BUAT SCAM REPORT</Link></div>:results.map((result)=><Link className="result-card" href={`/entity/${result.slug}`} aria-label={`Buka profil ${result.displayName}`} key={`${result.identifierId}-${result.entityId}`}><div><p className="panel-index">DATA COCOK · {labelIdentifierType(result.type)}</p><h2>{result.displayName}</h2><p className="matched-id">{result.displayValue}</p></div><RiskBadge count={Number(result.reportCount)}/><div className="result-metrics"><div className="result-meta"><strong>{result.reportCount}</strong><span>SCAM REPORT SUDAH DICEK</span></div><div className="result-meta positive"><strong>{result.successfulTransactionCount}</strong><span>TESTI TRANSAKSI</span></div></div><span className="card-link">BUKA PROFIL <span aria-hidden="true">↗</span></span></Link>)}</section>}
    <Disclaimer/>
  </main><Footer/></>;
}
