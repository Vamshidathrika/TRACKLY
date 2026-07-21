export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/((?!api/auth|login|signup|invite|_next|favicon.ico).*)"],
};
