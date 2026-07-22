import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <LoginForm
      // The Google provider is only registered when credentials are configured,
      // so hide the button rather than render one that 500s.
      googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID)}
      // The demo account has a published password; never expose it in production.
      demoEnabled={process.env.NODE_ENV !== "production"}
    />
  );
}
