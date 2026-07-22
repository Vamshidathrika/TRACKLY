import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  // The Google provider is only registered when credentials are configured,
  // so hide the button rather than render one that 500s.
  return <LoginForm googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID)} />;
}
