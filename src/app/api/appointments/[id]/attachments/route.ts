import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardContext } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const bucket = "encounter-attachments";
const maxFileSize = 4 * 1024 * 1024;
const idSchema = z.string().uuid();
type AppointmentAccess = { id: string; patient_id: string; professional_id: string; status: string };

async function getAccess(id: string) {
  const context = await getDashboardContext();
  if (!context) return { error: "AUTH_REQUIRED", status: 401 } as const;
  if (!idSchema.safeParse(id).success) return { error: "INVALID_APPOINTMENT", status: 400 } as const;
  const supabase = await createClient();
  const { data, error } = await supabase.from("appointments").select("id, patient_id, professional_id, status")
    .eq("id", id).eq("organization_id", context.organizationId).maybeSingle();
  if (error) return { error: "APPOINTMENT_LOAD_FAILED", status: 500 } as const;
  if (!data) return { error: "APPOINTMENT_NOT_FOUND", status: 404 } as const;
  if (data.professional_id !== context.userId && context.role !== "ADMIN") return { error: "ENCOUNTER_FORBIDDEN", status: 403 } as const;
  return { context, appointment: data as AppointmentAccess, supabase };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { data, error } = await access.supabase.from("encounter_attachments")
    .select("id, file_name, mime_type, size_bytes, created_at")
    .eq("organization_id", access.context.organizationId).eq("appointment_id", id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "ATTACHMENTS_LOAD_FAILED" }, { status: 500 });
  return NextResponse.json({ attachments: data ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (access.appointment.professional_id !== access.context.userId) return NextResponse.json({ error: "ENCOUNTER_FORBIDDEN" }, { status: 403 });
  if (!["CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(access.appointment.status)) return NextResponse.json({ error: "APPOINTMENT_NOT_IN_CARE" }, { status: 409 });
  const { data: encounter } = await access.supabase.from("encounters").select("status").eq("appointment_id", id).maybeSingle();
  if (encounter?.status === "FINALIZED") return NextResponse.json({ error: "ENCOUNTER_FINALIZED" }, { status: 409 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 1 || file.size > maxFileSize) return NextResponse.json({ error: "INVALID_FILE_SIZE" }, { status: 400 });
  const extension = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : file.name.toLowerCase().endsWith(".docx") ? "docx" : null;
  if (!extension) return NextResponse.json({ error: "INVALID_FILE_TYPE" }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const valid = extension === "pdf" ? bytes.subarray(0, 5).toString() === "%PDF-"
    : bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) && bytes.includes(Buffer.from("word/document.xml"));
  if (!valid) return NextResponse.json({ error: "INVALID_FILE_TYPE" }, { status: 400 });

  const mimeType = extension === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const fileName = file.name.replace(/[\\/\x00-\x1f\x7f]/g, "_").slice(0, 180);
  const storagePath = `${access.context.organizationId}/${id}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await access.supabase.storage.from(bucket).upload(storagePath, bytes, { contentType: mimeType, upsert: false });
  if (uploadError) return NextResponse.json({ error: "ATTACHMENT_UPLOAD_FAILED" }, { status: 500 });
  const { data, error } = await access.supabase.from("encounter_attachments").insert({
    organization_id: access.context.organizationId, appointment_id: id, patient_id: access.appointment.patient_id,
    storage_path: storagePath, file_name: fileName, mime_type: mimeType, size_bytes: bytes.length,
    uploaded_by: access.context.userId,
  }).select("id, file_name, mime_type, size_bytes, created_at").single();
  if (error) {
    await access.supabase.storage.from(bucket).remove([storagePath]);
    return NextResponse.json({ error: "ATTACHMENT_RECORD_FAILED" }, { status: 500 });
  }
  await access.supabase.from("audit_events").insert({ organization_id: access.context.organizationId, actor_user_id: access.context.userId, action: "ENCOUNTER_ATTACHMENT_CREATED", resource_type: "APPOINTMENT", resource_id: id });
  return NextResponse.json({ attachment: data }, { status: 201 });
}
