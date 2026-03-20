import { InvoiceDetailClient } from "../../../components/InvoiceDetailClient";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceDetailClient invoiceId={Number(id)} />;
}
