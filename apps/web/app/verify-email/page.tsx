import { Footer, Header } from "../components/SiteChrome";
import { VerifyEmailPanel } from "./VerifyEmailPanel";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <><Header compact/><main className="page shell narrow auth-flow-page"><p className="eyebrow">// KEAMANAN AKUN</p><h1 className="page-title">VERIFIKASI EMAIL.</h1><p className="page-intro">Kami memastikan alamat email benar-benar berada di bawah kendalimu.</p><VerifyEmailPanel token={token}/></main><Footer/></>;
}
