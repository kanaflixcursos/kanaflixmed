import { AppointmentDetail } from "@/components/appointment-detail";

export default async function AppointmentDetailsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ returnTo?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const returnTo = query.returnTo?.startsWith("/agenda") && !query.returnTo.startsWith("//") ? query.returnTo : "/agenda";
  return <AppointmentDetail id={id} returnTo={returnTo} />;
}
