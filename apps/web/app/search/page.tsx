import { ArrowIcon } from "../components/ArrowIcon";
import { SearchForm } from "../components/SearchForm";
import Link from "next/link";
import { labelIdentifierType } from "@valrify/domain";
import { searchPublic } from "../../lib/api";
import { Disclaimer, Footer, Header } from "../components/SiteChrome";

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
  const response = search.kind === "valid" ? await searchPublic(search.query) : [];
  const results = response ?? [];
  const state = getSearchViewState(search, results.length);
  const visibleQuery = search.query;

  return <><Header compact/><main className="page shell search-page">
    <p className="section-label eyebrow">// CEK SEBELUM TRANSAKSI</p><h1 className="page-title">CEK NOMOR ATAU AKUN.</h1>
    <SearchForm key={visibleQuery} className="page-search">
      <label htmlFor="search-q">Nomor atau nama akun</label>
      <input id="search-q" name="q" defaultValue={visibleQuery} placeholder="Ketik data yang ingin dicek" minLength={SEARCH_QUERY_MIN_LENGTH} maxLength={SEARCH_QUERY_MAX_LENGTH} aria-describedby="search-help" aria-invalid={state === "invalid"}/>
      <button type="submit">Cek sekarang <span aria-hidden="true"><ArrowIcon/></span></button>
      <p id="search-help" className="search-help">Nomor rekening, e-wallet, dan telepon dicari secara tepat. Nama atau username dapat dicari dari dua karakter.</p>
    </SearchForm>

    {state === "invalid" && <section className="search-state search-state-invalid" aria-live="polite">
      <span className="search-state-code">INPUT TIDAK VALID</span>
      <h2>PERIKSA KATA PENCARIAN.</h2>
      <p>{search.kind === "invalid" ? search.message : "Masukkan data yang ingin dicari."}</p>
      <div className="search-examples"><strong>CONTOH YANG BISA DICARI</strong><span>Nama seller · 0812... · nomor rekening · Riot ID · username Discord</span></div>
      <a className="tactical-button" href="#search-q">PERBAIKI PENCARIAN</a>
    </section>}

    {response === null && <section className="search-state" role="alert"><h2>Pencarian belum bisa dimuat.</h2><p>Coba lagi sebentar. Data yang gagal dimuat bukan berarti tidak ada laporan.</p></section>}
    {state === "empty" && response !== null && <section className="search-state search-state-empty" aria-live="polite">
      <span className="search-state-code">BELUM ADA DATA</span>
      <p className="result-query">HASIL UNTUK <strong>“{visibleQuery}”</strong></p>
      <h2>BELUM DITEMUKAN DI VALRIFY.</h2>
      <p>Belum ada laporan yang cocok. Tetap cek sebelum transfer; hasil kosong bukan jaminan aman.</p>
      <Link href="/cara-aman" className="tactical-button">Baca panduan transaksi <ArrowIcon/></Link>
    </section>}
    {state === "found" && <section className="results" aria-live="polite">
      <div className="search-found-heading"><h2>{results.length} profil cocok</h2><p>Hasil untuk “{visibleQuery}”</p></div>
      <p className="search-found-note">Cocokkan nomor dan akun sebelum menyimpulkan. Nama yang sama belum tentu orang yang sama.</p>
      {results.map(result => <Link className="result-card" href={`/entity/${result.slug}`} key={`${result.identifierId}-${result.entityId}`}>
        <div><p className="panel-index">{labelIdentifierType(result.type)}</p><h2>{result.displayName}</h2><p className="matched-id">{result.displayValue}</p></div>
        <span>{result.reportCount} laporan ditampilkan</span><span className="card-link">Buka profil <ArrowIcon/></span>
      </Link>)}
    </section>}
    <Disclaimer/>
  </main><Footer/></>;
}
