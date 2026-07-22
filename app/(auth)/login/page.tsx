import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <LoginForm
      googleEnabled={true}
      // The demo account has a published password; never expose it in production.
      demoEnabled={process.env.NODE_ENV !== "production"}
    />
  );
}
