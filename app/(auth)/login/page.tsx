import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <LoginForm
      googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID)}
    />
  );
}
