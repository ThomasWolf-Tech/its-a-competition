import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "./supabase/server";
import { safeNext, authOrigin } from "./auth-navigation";
import { readProfile } from "./profile";

export async function completeAuth(request: NextRequest, recovery: boolean) {
  const code = request.nextUrl.searchParams.get("code");
  let returnPath = "";
  try { returnPath = decodeURIComponent(request.cookies.get("competition_auth_next")?.value ?? ""); } catch { /* Invalid return cookies use the account page. */ }
  const next = safeNext(returnPath);
  let target = `/login?error=link&next=${encodeURIComponent(next)}`;
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      if (recovery) target = "/auth/reset-password";
      else {
        const profile = await readProfile(supabase, data.user.id);
        target = profile.handle && !profile.deactivated_at ? next : `/account?next=${encodeURIComponent(next)}`;
      }
    }
  }
  const response = NextResponse.redirect(new URL(target, authOrigin(request.url, request.headers.get("host"), process.env.NEXT_PUBLIC_SITE_URL)));
  response.cookies.set("competition_auth_next", "", { path: "/auth", maxAge: 0, sameSite: "lax" });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
