import { PatientEditor } from "@/components/patient-editor";

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatientEditor patientId={id} />;
}
