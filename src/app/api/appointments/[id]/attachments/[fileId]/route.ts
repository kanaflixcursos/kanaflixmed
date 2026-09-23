import { NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardContext } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const uuid = z.string().uuid();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { id, fileId } = await params;
  if (!uuid.safeParse(id).success || !uuid.safeParse(fileId).success) return NextResponse.json({ error: "INVALID_ATTACHMENT" }, { status: 400 });
  const supabase = await createClient();
  const { data: attachment, error } = await supabase.from("encounter_attachments")
    .select("storage_path, file_name, mime_type")
    .eq("id", fileId).eq("appointment_id", id).eq("organization_id", context.organizationId).maybeSingle();
  if (error) return NextResponse.json({ error: "ATTACHMENT_LOAD_FAILED" }, { status: 500 });
  if (!attachment) return NextResponse.json({ error: "ATTACHMENT_NOT_FOUND" }, { status: 404 });
  const { data, error: downloadError } = await supabase.storage.from("encounter-attachments").download(attachment.storage_path);
  if (downloadError || !data) return NextResponse.json({ error: "ATTACHMENT_DOWNLOAD_FAILED" }, { status: 500 });
  const encodedName = encodeURIComponent(attachment.file_name);
  return new Response(await data.arrayBuffer(), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="documento.${attachment.mime_type === "application/pdf" ? "pdf" : "docx"}"; filename*=UTF-8''${encodedName}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
