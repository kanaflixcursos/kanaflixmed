import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardContext } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

const serviceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  durationMinutes: z.number().int().min(5).max(1440).optional().default(30),
  priceCents: z.number().int().min(0).max(100000000).optional().default(0),
});

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents, active")
    .eq("organization_id", context.organizationId)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ services: data ?? [] });
}

export async function POST(request: NextRequest) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const parsed = serviceSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_SERVICE", details: parsed.error.flatten() }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({
      organization_id: context.organizationId,
      name: parsed.data.name,
      duration_minutes: parsed.data.durationMinutes,
      price_cents: parsed.data.priceCents,
    })
    .select("id, name, duration_minutes, price_cents, active")
    .single();

  if (error) return NextResponse.json({ error: error.code === "23505" ? "SERVICE_ALREADY_EXISTS" : error.message }, { status: error.code === "23505" ? 409 : 500 });
  return NextResponse.json({ service: data }, { status: 201 });
}
