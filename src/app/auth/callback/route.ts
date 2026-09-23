import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const response = NextResponse.redirect(new URL("/login?error=callback", request.url));
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!code || !url || !key) {
    return NextResponse.redirect(new URL("/login?error=callback", request.url));
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) return response;

  let redirectPath = next?.startsWith("/") && next !== "/auth/post-login" ? next : "/dashboard";
  if (next === "/auth/post-login") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return response;

    const { data: memberships, error: membershipError } = await supabase
      .from("memberships")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("status", "ACTIVE")
      .limit(1);

    if (membershipError) {
      response.headers.set("Location", new URL("/login?error=clinic", request.url).toString());
      return response;
    }

    redirectPath = memberships?.length ? "/dashboard" : "/onboarding";
  }

  response.headers.set("Location", new URL(redirectPath, request.url).toString());
  return response;
}
