import { NextResponse } from "next/server";
import { getDashboardContext, getTodayAppointments } from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const context = await getDashboardContext();
    if (!context) return NextResponse.json({ context: null, appointments: [] });

    const appointments = await getTodayAppointments();
    return NextResponse.json({ context, appointments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao carregar o dashboard.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
