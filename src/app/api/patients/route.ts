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

const patientUpdateSchema = patientSchema.extend({
  id: z.string().uuid(),
});

export const dynamic = "force-dynamic";

async function writeAudit(action: string, resourceId: string, organizationId: string, userId: string) {
  const supabase = await createClient();
  await supabase.from("audit_events").insert({
    organization_id: organizationId,
    actor_user_id: userId,
    action,
    resource_type: "PATIENT",
    resource_id: resourceId,
  });
}

export async function GET(request: NextRequest) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const search = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const supabase = await createClient();
  let query = supabase
    .from("patients")
    .select("id, record_number, display_name, legal_name, birth_date, phone_e164, email, notes, created_at")
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
    .select("id, record_number, display_name, legal_name, birth_date, phone_e164, email, notes, created_at")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: error.code === "23505" ? "PATIENT_ALREADY_EXISTS" : error.message }, { status });
  }

  await writeAudit("PATIENT_CREATED", data.id, context.organizationId, context.userId);

  return NextResponse.json({ patient: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const parsed = patientUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PATIENT", details: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...values } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .update({
      display_name: values.displayName,
      legal_name: values.legalName || null,
      birth_date: values.birthDate || null,
      phone_e164: values.phone || null,
      email: values.email || null,
      notes: values.notes || null,
    })
    .eq("id", id)
    .eq("organization_id", context.organizationId)
    .eq("active", true)
    .select("id, record_number, display_name, legal_name, birth_date, phone_e164, email, notes, created_at")
    .maybeSingle();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: error.code === "23505" ? "PATIENT_ALREADY_EXISTS" : error.message }, { status });
  }
  if (!data) return NextResponse.json({ error: "PATIENT_NOT_FOUND" }, { status: 404 });

  await writeAudit("PATIENT_UPDATED", data.id, context.organizationId, context.userId);

  return NextResponse.json({ patient: data });
}

export async function DELETE(request: NextRequest) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_PATIENT" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .update({ active: false })
    .eq("id", parsed.data.id)
    .eq("organization_id", context.organizationId)
    .eq("active", true)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "PATIENT_NOT_FOUND" }, { status: 404 });

  await writeAudit("PATIENT_ARCHIVED", data.id, context.organizationId, context.userId);

  return NextResponse.json({ success: true });
}
