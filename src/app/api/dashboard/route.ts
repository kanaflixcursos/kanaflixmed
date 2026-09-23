import { NextResponse } from "next/server";
import { getDashboardContext } from "@/lib/data/dashboard";
import { clinicToday } from "@/lib/date-time";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  period: z.enum(["day", "week", "month"]).default("week"),
  anchor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET(request: Request) {
  try {
    const context = await getDashboardContext();
    if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: "INVALID_PERIOD" }, { status: 400 });

    const anchor = parsed.data.anchor ?? clinicToday(context.timezone);
    const previousDate = new Date(`${anchor}T12:00:00Z`);
    if (parsed.data.period === "day") previousDate.setUTCDate(previousDate.getUTCDate() - 1);
    else if (parsed.data.period === "week") previousDate.setUTCDate(previousDate.getUTCDate() - 7);
    else { previousDate.setUTCDate(1); previousDate.setUTCMonth(previousDate.getUTCMonth() - 1); }
    const previousAnchor = previousDate.toISOString().slice(0, 10);
    const supabase = await createClient();
    const [currentResult, previousResult] = await Promise.all([
      supabase.rpc("clinic_dashboard", { target_org: context.organizationId, target_period: parsed.data.period, anchor_date: anchor }),
      supabase.rpc("clinic_dashboard", { target_org: context.organizationId, target_period: parsed.data.period, anchor_date: previousAnchor }),
    ]);
    const { data, error } = currentResult;
    if (error) {
      const code = error.message.includes("ORG_FORBIDDEN") ? "ORG_FORBIDDEN" : "DASHBOARD_UNAVAILABLE";
      return NextResponse.json({ error: code }, { status: code === "ORG_FORBIDDEN" ? 403 : 500 });
    }
    const previous = previousResult.error ? null : previousResult.data as { summary?: Record<string, number> } | null;
    const currentSummary = (data as { summary?: Record<string, number> } | null)?.summary ?? {};
    const previousSummary = previous?.summary ?? {};
    const comparison = previous ? Object.fromEntries(Object.entries(currentSummary).map(([key, value]) => {
      const previousValue = previousSummary[key] ?? 0;
      return [key, { delta: value - previousValue, percent: previousValue ? Math.round(((value - previousValue) / previousValue) * 100) : null }];
    })) : {};
    return NextResponse.json({ ...(data as object), comparison });
  } catch (error) {
    console.error("Dashboard request failed", error);
    return NextResponse.json({ error: "DASHBOARD_UNAVAILABLE" }, { status: 500 });
  }
}
