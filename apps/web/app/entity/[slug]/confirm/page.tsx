import { notFound } from "next/navigation";
import { ConfirmationForm } from "../../../components/ConfirmationForm";
import { Footer, Header } from "../../../components/SiteChrome";
import { getEntity } from "../../../../lib/api";

export const dynamic = "force-dynamic";

export default async function ConfirmTransactionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entity = await getEntity(slug);
  if (!entity) notFound();

  return (
    <>
      <Header compact />
      <main className="page shell narrow">
        <p className="eyebrow">// TESTI TRANSAKSI</p>
        <h1 className="page-title">TRANSAKSINYA LANCAR?</h1>
        <p className="page-intro">
          Kalau kamu pernah jual-beli dengan {entity.displayName} dan semuanya
          selesai sesuai kesepakatan, ceritakan pengalamanmu di sini. Setiap testi
          dicek moderator sebelum tampil di profil.
        </p>
        <ConfirmationForm
          entityId={entity.id}
          entityName={entity.displayName}
          entitySlug={entity.slug}
        />
      </main>
      <Footer />
    </>
  );
}
