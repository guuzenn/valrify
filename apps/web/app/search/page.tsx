import Link from "next/link";
import { labelIdentifierType } from "@vlrfy/domain";
import { searchPublic } from "../../lib/api";
import { Disclaimer, Footer, Header } from "../components/SiteChrome";
import { RiskBadge } from "../components/RiskBadge";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const results = q ? await searchPublic(q) : [];
  return <><Header compact/><main className="page shell">
    <p className="eyebrow">// CEK SEBELUM TRANSAKSI</p><h1 className="page-title">CEK NOMOR ATAU AKUN.</h1>
    <form action="/search" className="page-search"><label className="sr-only" htmlFor="search-q">Masukkan nomor atau akun</label><input id="search-q" name="q" defaultValue={q} placeholder="Nomor, rekening, Discord, Facebook, Riot ID..." required/><button>CEK SEKARANG ↗</button></form>
    {q&&<section className="results"><p className="result-query">HASIL UNTUK <strong>“{q}”</strong></p>{results.length===0?<div className="empty-state"><span>00</span><h2>BELUM ADA CATATAN.</h2><p>Nomor atau akun ini belum ditemukan di VLRFY. Bukan berarti pasti aman—tetap cek identitas dan pakai rekber kalau perlu.</p><Link href="/submit" className="tactical-button">BUAT LAPORAN</Link></div>:results.map((result)=><article className="result-card" key={`${result.identifierId}-${result.entityId}`}><div><p className="panel-index">DATA COCOK · {labelIdentifierType(result.type)}</p><h2>{result.displayName}</h2><p className="matched-id">{result.maskedValue}</p></div><RiskBadge count={Number(result.reportCount)}/><div className="result-metrics"><div className="result-meta"><strong>{result.reportCount}</strong><span>LAPORAN SUDAH DICEK</span></div><div className="result-meta positive"><strong>{result.successfulTransactionCount}</strong><span>TESTI TRANSAKSI</span></div></div><Link className="card-link" href={`/entity/${result.slug}`}>BUKA PROFIL ↗</Link></article>)}</section>}
    <Disclaimer/>
  </main><Footer/></>;
}
