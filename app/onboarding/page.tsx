import { getAuthUser } from "@/lib/auth";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const user = await getAuthUser();

  return (
    <OnboardingWizard
      userEmail={user.email}
      userName={user.name || user.email}
    />
  );
}
