import { getAuthUser } from "@/lib/auth";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  let userEmail = "dev@trackly.io";
  let userName = "Dev Lead";

  try {
    const user = await getAuthUser();
    if (user) {
      userEmail = user.email || "dev@trackly.io";
      userName = user.name || "Dev Lead";
    }
  } catch (err) {
    // Fallback demo mode if unauthenticated
  }

  return <OnboardingWizard userEmail={userEmail} userName={userName} />;
}
