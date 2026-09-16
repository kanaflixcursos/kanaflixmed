import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardContext } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

const patientSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  legalName: z.string().trim().max(160).optional().default(""),
  birthDate: z.string().trim().max(10).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  email: z.string().trim().email().max(160).optional().or(z.literal("")).default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const search = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const supabase = await createClient();
  let query = supabase
    .from("patients")
    .select("id, record_number, display_name, birth_date, phone_e164, email, notes, created_at")
    .eq("organization_id", context.organizationId)
    .eq("active", true)
    .order("display_name", { ascending: true })
    .limit(100);

  if (search) query = query.ilike("display_name", `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ patients: data ?? [] });
}

export async function POST(request: NextRequest) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const parsed = patientSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PATIENT", details: parsed.error.flatten() }, { status: 400 });
  }

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .insert({
      organization_id: context.organizationId,
      display_name: values.displayName,
      legal_name: values.legalName || null,
      birth_date: values.birthDate || null,
      phone_e164: values.phone || null,
      email: values.email || null,
      notes: values.notes || null,
    })
    .select("id, record_number, display_name, birth_date, phone_e164, email, notes, created_at")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: error.code === "23505" ? "PATIENT_ALREADY_EXISTS" : error.message }, { status });
  }

  return NextResponse.json({ patient: data }, { status: 201 });
}
