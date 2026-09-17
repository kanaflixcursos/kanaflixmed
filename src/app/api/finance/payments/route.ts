import { NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardContext } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

const paymentSchema = z.object({
  financialEntryId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  method: z.enum(["CASH", "PIX", "DEBIT_CARD", "CREDIT_CARD", "TRANSFER", "OTHER"]),
  idempotencyKey: z.string().min(8).max(120),
});

const errorStatus: Record<string, number> = {
  FINANCE_FORBIDDEN: 403,
  FINANCIAL_ENTRY_NOT_FOUND: 404,
  FINANCIAL_ENTRY_NOT_RECEIVABLE: 400,
  PAYMENT_AMOUNT_INVALID: 400,
  PAYMENT_IDEMPOTENCY_KEY_INVALID: 400,
  PAYMENT_IDEMPOTENCY_CONFLICT: 409,
  PAYMENT_EXCEEDS_BALANCE: 409,
};

export async function POST(request: Request) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const parsed = paymentSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_finance_payment", {
    target_financial_entry: parsed.data.financialEntryId,
    payment_amount_cents: parsed.data.amountCents,
    payment_method: parsed.data.method,
    payment_idempotency_key: parsed.data.idempotencyKey,
  });

  if (error) {
    const code = error.message.match(/(?:P0001: )?(FINANCE_[A-Z_]+|FINANCIAL_ENTRY_[A-Z_]+|PAYMENT_[A-Z_]+)/)?.[1] ?? "PAYMENT_FAILED";
    return NextResponse.json({ error: code }, { status: errorStatus[code] ?? 500 });
  }

  return NextResponse.json({ payment: data }, { status: 201 });
}
