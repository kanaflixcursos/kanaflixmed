import { PrescriptionPrint } from "@/components/prescription-print";

export default async function PrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PrescriptionPrint id={id} />;
}
