import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Default to dashboard for returning users; onboarding will catch new ones
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Robust check for existing onboarding (supports VIEW + real table)
        let hasOnboarding = false;

        try {
          // Try real table first
          const { data: userProfile } = await supabase
            .from("user_profiles")
            .select("onboarding_data, onboarding_answers")
            .eq("user_id", user.id)
            .single();

          if (userProfile && ((userProfile.onboarding_data && Object.keys(userProfile.onboarding_data).length > 0) || 
              (userProfile.onboarding_answers && Object.keys(userProfile.onboarding_answers).length > 0))) {
            hasOnboarding = true;
          } else {
            // Fallback to VIEW
            const { data: vcProfile } = await supabase
              .from("vc_profiles")
              .select("onboarding_completed, onboarding_data, onboarding_answers")
              .eq("user_id", user.id)
              .single();

            hasOnboarding =
              vcProfile?.onboarding_completed === true ||
              (vcProfile?.onboarding_data && Object.keys(vcProfile.onboarding_data).length > 0) ||
              (vcProfile?.onboarding_answers && Object.keys(vcProfile.onboarding_answers).length > 0);
          }
        } catch (e) {
          // No profile row yet → treat as new user
          hasOnboarding = false;
        }

        if (hasOnboarding) {
          // Returning user with completed onboarding → dashboard + projects
          return NextResponse.redirect(`${origin}/dashboard`);
        } else {
          // New Google user (or incomplete) → force onboarding to initialize profile + AI plan
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }

      // Fallback
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect to auth page with error
  return NextResponse.redirect(`${origin}/auth?error=auth_failed`);
}
