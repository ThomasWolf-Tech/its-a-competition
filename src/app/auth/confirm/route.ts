import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext, authOrigin } from "@/lib/auth-navigation";
import { readProfile } from "@/lib/profile";

export async function GET(request: NextRequest) {
  const origin = authOrigin(request.url, request.headers.get("host"), process.env.NEXT_PUBLIC_SITE_URL);
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (token_hash && (type === "signup" || type === "email" || type === "recovery")) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error && data.user) {
      let target = "/auth/reset-password";
      if (type !== "recovery") {
        const profile = await readProfile(supabase, data.user.id);
        target = profile.handle ? next : `/account?next=${encodeURIComponent(next)}`;
      }
      const response = NextResponse.redirect(new URL(target, origin));
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", origin));
}
