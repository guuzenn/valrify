import { ArrowIcon } from "../components/ArrowIcon";
import { SearchForm } from "../components/SearchForm";
import Link from "next/link";
import { labelIdentifierType } from "@valrify/domain";
import { searchPublic } from "../../lib/api";
import { Disclaimer, Footer, Header } from "../components/SiteChrome";

import {
  getSearchViewState,
  parseSearchQuery,
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
    <h1 className="sr-only">Hasil pencarian profil</h1>
    <SearchForm key={visibleQuery} defaultValue={visibleQuery} invalid={state === "invalid"}/>

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
      <div className="search-found-heading"><h2>{results.length} profil ditemukan <span>untuk “{visibleQuery}”</span></h2></div>
      <p className="search-found-note">{results.some((result, index) => result.identifierId !== null && results.some((other, otherIndex) => otherIndex !== index && other.identifierId === result.identifierId)) ? "Data yang sama ditemukan pada beberapa profil. Buka profil untuk melihat laporan dan hubungannya." : "Cocokkan nomor dan akun. Nama yang sama belum tentu orang yang sama."}</p>
      {results.map(result => {
        const related = result.matchedReports ?? [];
        const mentioned = result.identifierId !== null && related.length > 0;
        const nameMatch = ["PERSON_NAME", "FACEBOOK_NAME"].includes(result.type);
        return <article className="result-card" key={`${result.identifierId}-${result.entityId}`}>
          <div><p className="panel-index">{mentioned ? `${nameMatch ? "Nama" : "Data"} ditemukan dalam laporan` : "Profil ditemukan"}</p><h2>{result.displayName}</h2>
            <p className="matched-id">{mentioned ? <>{labelIdentifierType(result.type)} <strong>“{result.displayValue}”</strong> disebut dalam laporan terkait profil ini.</> : result.displayValue}</p>
          </div>
          <div className="search-match-actions">
            <span>{mentioned ? related.length : result.reportCount} laporan {mentioned ? "terkait" : "ditampilkan"}</span>
            {related.length === 1 && <Link className="card-link" href={`/case/${related[0]!.publicId}`}>Lihat laporan terkait <ArrowIcon/></Link>}
            {related.length > 1 && <details><summary>Lihat {related.length} laporan terkait</summary><ul>{related.map(report => <li key={report.publicId}><Link href={`/case/${report.publicId}`}>{report.title} <ArrowIcon/></Link></li>)}</ul></details>}
            <Link className={mentioned ? "search-profile-link" : "card-link"} href={`/entity/${result.slug}`}>Buka profil <ArrowIcon/></Link>
          </div>
        </article>;
      })}
    </section>}
    <Disclaimer/>
  </main><Footer/></>;
}
