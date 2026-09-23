import { EncounterEditor } from "@/components/encounter-editor";

export default async function EncounterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EncounterEditor id={id} />;
}
