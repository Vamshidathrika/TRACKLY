# Trackly Authenticator & Auth Protection Restoration Plan

Goal: Restore NextAuth v5 authentication, route protection middleware, and add a Demo Sign-In button on the login page.

## Proposed Tasks

### Task 1: Update Auth Session Resolver & Middleware
- Files: `lib/auth.ts`, `middleware.ts`
- Restore real NextAuth session resolution in `getAuthUser()` and enforce route protection in `middleware.ts`.

### Task 2: Login Page with Demo Quick Sign-In
- Files: `app/(auth)/login/page.tsx`, `components/auth/LoginForm.tsx`, `app/(auth)/login/actions.ts`
- Build Login UI with email/password, Google OAuth, and "Login as Demo User" one-click action.

### Task 3: Signup Page & Workspace Initialization
- Files: `app/(auth)/signup/page.tsx`, `components/auth/SignupForm.tsx`
- Build Signup UI with automatic site workspace creation.

### Task 4: Fix Auth Playwright E2E Tests
- Files: `e2e/auth.spec.ts`
- Run full Playwright test suite to verify login, signup, demo login, and logout.
