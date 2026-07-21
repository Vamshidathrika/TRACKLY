# Trackly — Authenticator & Auth Protection Restoration — Design Spec

Date: 2026-07-21  
Status: Approved  
Author: Antigravity Superpowers  

## Product Goal

Restore full **NextAuth v5 Authentication System**, route protection middleware, credentials & Google OAuth authentication, and provide a **"Demo Account Quick Sign-In"** button on the `/login` page for friction-free demo access.

---

## Technical Scope

### 1. Route Protection Middleware (`middleware.ts`)
- Configures NextAuth edge middleware to protect `/your-work`, `/projects`, `/filters`, `/dashboards`, `/settings`.
- Unauthenticated requests to protected routes are redirected to `/login?callbackUrl=...`.
- Public routes: `/login`, `/signup`, `/invite/*`, `/api/auth/*`.

### 2. Session Auth Helper (`lib/auth.ts`)
- `getAuthUser()` reads NextAuth JWT session user.
- If authenticated: returns the Prisma `User` record.
- If unauthenticated: redirects to `/login`.

### 3. Login Page & Demo Sign-In (`app/(auth)/login/page.tsx`)
- Email & password form with credentials validation (`signIn("credentials", ...)`).
- **"Login as Demo User"** button: Performs one-click sign in using pre-seeded `demo@trackly.dev` credentials.
- Google OAuth sign-in button (`signIn("google")`).

### 4. Signup Page & Workspace Creation (`app/(auth)/signup/page.tsx`, `lib/signup.ts`)
- Name, Email, Password, Workspace Name form.
- Creates User + Workspace Site + Membership transactional record (`signupWithSite`).

---

## Verification Plan

1. **Unit Tests**:
   - `lib/signup.test.ts` for workspace signup transaction.
   - `lib/auth.test.ts` for session parsing.
2. **Playwright E2E Tests**:
   - `e2e/auth.spec.ts`: Test full authentication flow (unauthenticated redirect -> login -> demo login -> signup -> logout).
