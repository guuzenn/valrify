import { ArrowIcon } from "./components/ArrowIcon";
import Link from "next/link";
import { Footer, Header } from "./components/SiteChrome";

export default function NotFound() {
  return <><Header compact backLabel="Kembali ke beranda"/><main className="page shell narrow info-page">
    <div className="info-hero"><p className="section-label eyebrow">// 404</p><h1 className="page-title">HALAMAN<br/>BELUM KETEMU.</h1><p className="page-intro">Link mungkin salah, atau halaman ini sudah tidak tersedia. Kamu bisa kembali ke beranda atau mencari nomor dan akun lain.</p></div>
    <div className="info-actions"><Link className="tactical-button" href="/search">CEK NOMOR / AKUN</Link><Link href="/">Kembali ke beranda <span aria-hidden="true"><ArrowIcon direction="right"/></span></Link></div>
  </main><Footer/></>;
}
