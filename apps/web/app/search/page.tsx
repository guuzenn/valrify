import { ArrowIcon } from "../components/ArrowIcon";
import { SearchForm } from "../components/SearchForm";
import Link from "next/link";
import { labelIdentifierType } from "@valrify/domain";
import { searchPublic } from "../../lib/api";
import { Disclaimer, Footer, Header } from "../components/SiteChrome";
import { RiskBadge } from "../components/RiskBadge";
import {
  getSearchViewState,
  parseSearchQuery,
  SEARCH_QUERY_MAX_LENGTH,
  SEARCH_QUERY_MIN_LENGTH,
} from "./search-state";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const search = parseSearchQuery(q);
  const results = search.kind === "valid" ? await searchPublic(search.query) : [];
  const state = getSearchViewState(search, results.length);
  const visibleQuery = search.query;

  return <><Header compact/><main className="page shell search-page">
    <p className="eyebrow">// CEK SEBELUM TRANSAKSI</p><h1 className="page-title">CEK NOMOR ATAU AKUN.</h1>
    <SearchForm key={visibleQuery} className="page-search">
      <label className="sr-only" htmlFor="search-q">Masukkan nama, nomor, atau akun</label>
      <input id="search-q" name="q" defaultValue={visibleQuery} placeholder="Nama seller, nama lain, rekening, Discord, Facebook..." minLength={SEARCH_QUERY_MIN_LENGTH} maxLength={SEARCH_QUERY_MAX_LENGTH} aria-describedby="search-help" aria-invalid={state === "invalid"}/>
      <button type="submit">CEK SEKARANG <span aria-hidden="true"><ArrowIcon/></span></button>
      <p id="search-help" className="search-help">Nomor rekening, e-wallet, dan telepon dicari secara tepat. Nama atau username dapat dicari dari dua karakter.</p>
    </SearchForm>

    {state === "invalid" && <section className="search-state search-state-invalid" aria-live="polite">
      <span className="search-state-code">INPUT TIDAK VALID</span>
      <h2>PERIKSA KATA PENCARIAN.</h2>
      <p>{search.kind === "invalid" ? search.message : "Masukkan data yang ingin dicari."}</p>
      <div className="search-examples"><strong>CONTOH YANG BISA DICARI</strong><span>Nama seller · 0812... · nomor rekening · Riot ID · username Discord</span></div>
      <a className="tactical-button" href="#search-q">PERBAIKI PENCARIAN</a>
    </section>}

    {state === "empty" && <section className="search-state search-state-empty" aria-live="polite">
      <span className="search-state-code">BELUM ADA DATA</span>
      <p className="result-query">HASIL UNTUK <strong>“{visibleQuery}”</strong></p>
      <h2>BELUM DITEMUKAN DI VALRIFY.</h2>
      <p>Belum ada laporan yang sudah diperiksa admin untuk data ini. Hasil kosong bukan berarti transaksi pasti aman.</p>
      <div className="search-next-steps" aria-label="Langkah selanjutnya">
        <article><span>01</span><div><strong>COCOKKAN DATA LAIN</strong><p>Cari juga nama pemilik rekening, nomor telepon, atau username lain milik pihak yang sama.</p></div></article>
        <article><span>02</span><div><strong>CEK SEBELUM TRANSFER</strong><p>Ikuti pemeriksaan akun dan identitas sebelum mengirim uang.</p></div></article>
      </div>
      <div className="search-state-actions"><Link href="/cara-aman" className="tactical-button">BACA CARA AMAN <span aria-hidden="true"><ArrowIcon/></span></Link><Link href="/submit" className="search-secondary-link">LAPORKAN KASUS <span aria-hidden="true">→</span></Link></div>
    </section>}

    {state === "found" && <section className="results" aria-live="polite">
      <div className="search-found-heading"><div><span className="search-state-code">DATA DITEMUKAN</span><p className="result-query">HASIL UNTUK <strong>“{visibleQuery}”</strong></p></div><strong>{results.length} PROFIL COCOK</strong></div>
      <div className="search-found-note"><strong>BUKA PROFIL SEBELUM BERTRANSAKSI.</strong><p>Periksa laporan, nomor dan akun terkait, serta tanggal kejadian. Kecocokan data adalah sinyal untuk berhati-hati, bukan putusan hukum.</p></div>
      {results.map((result)=><Link className="result-card" href={`/entity/${result.slug}`} aria-label={`Buka profil ${result.displayName}`} key={`${result.identifierId}-${result.entityId}`}><div><p className="panel-index">DATA COCOK · {labelIdentifierType(result.type)}</p><h2>{result.displayName}</h2><p className="matched-id">{result.displayValue}</p></div><RiskBadge count={Number(result.reportCount)}/><div className="result-metrics"><div className="result-meta"><strong>{result.reportCount}</strong><span>LAPORAN SUDAH DICEK</span></div><div className="result-meta positive"><strong>{result.successfulTransactionCount}</strong><span>TESTI TRANSAKSI</span></div></div><span className="card-link">BUKA PROFIL <span aria-hidden="true"><ArrowIcon/></span></span></Link>)}
    </section>}
    <Disclaimer/>
  </main><Footer/></>;
}
