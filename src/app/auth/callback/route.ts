import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has a vc_profile (completed onboarding)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Robust check: support both legacy VIEW (vc_profiles) and real table (user_profiles)
        // Checks onboarding_completed (VIEW), onboarding_data, or onboarding_answers (non-empty)
        const { data: profile } = await supabase
          .from("vc_profiles")
          .select("onboarding_completed, onboarding_data, onboarding_answers")
          .eq("user_id", user.id)
          .single();

        const hasOnboarding =
          profile?.onboarding_completed === true ||
          (profile?.onboarding_data && Object.keys(profile.onboarding_data).length > 0) ||
          (profile?.onboarding_answers && Object.keys(profile.onboarding_answers).length > 0);

        if (hasOnboarding) {
          // Already onboarded → dashboard (ignore default onboarding redirect)
          return NextResponse.redirect(`${origin}/dashboard`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect to auth page with error
  return NextResponse.redirect(`${origin}/auth?error=auth_failed`);
}
