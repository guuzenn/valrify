import { ArrowIcon } from "./ArrowIcon";
import { NavigationLink as Link } from "./NavigationLink";
import { MobileMenu } from "./MobileMenu";
import { SiteNavigation } from "./SiteNavigation";

export function Header({ compact=false, home=false, backHref="/", backLabel="Kembali" }:{compact?:boolean;home?:boolean;backHref?:string;backLabel?:string}) {
  return <><div className="site-header-band"><header className={`site-header shell ${compact?"compact":""}`}><Link className="wordmark" href="/" aria-label="Valrify beranda">VALRIFY<span>{"//"}</span></Link><SiteNavigation home={home}/><MobileMenu/></header></div>{!home && <div className="mobile-back-row shell"><Link href={backHref}><span aria-hidden="true"><ArrowIcon direction="left"/></span> {backLabel}</Link></div>}</>;
}
export function Footer(){return <div className="site-footer-band"><footer className="shell"><div><div className="wordmark">VALRIFY<span>{"//"}</span></div><small className="footer-independent">Proyek komunitas · Tidak berafiliasi dengan Riot Games</small></div><div><p>Cek riwayat penjual atau pembeli akun Valorant sebelum transaksi.</p><nav className="footer-links" aria-label="Informasi Valrify"><Link href="/rekber">Rekomendasi rekber</Link><Link href="/privasi">Privasi</Link><Link href="/ketentuan">Ketentuan</Link><Link href="/kontak">Kontak & koreksi</Link></nav></div><small>Valrify by reyv · © 2026</small></footer></div>}
export function Disclaimer(){return <aside className="inline-disclaimer"><strong>INGAT</strong><span>Laporan diterbitkan admin, moderator, atau rekber terverifikasi untuk kirimannya sendiri. Informasi di Valrify bukan putusan hukum dan bukan jaminan transaksi pasti aman.</span></aside>}
