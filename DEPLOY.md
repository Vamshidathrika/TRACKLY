# Deploying Trackly

Target stack: **CockroachDB Cloud** + **Vercel** + **Vercel Blob**.

---

## 1. Database — CockroachDB Cloud

1. Create a free cluster at https://cockroachlabs.cloud
2. Create a database named `trackly`
3. Create a SQL user and copy the **connection string**
4. Use the **pooled** connection string if offered — serverless functions open a
   connection per invocation and will exhaust a direct connection limit

The schema is already portable: it uses `cuid()` throughout, no
`autoincrement()`, and no `@db.*` native type annotations, so nothing needs
rewriting for CockroachDB.

Switch the datasource in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "cockroachdb"   // was "postgresql"
  url      = env("DATABASE_URL")
}
```

Then push the schema:

```bash
DATABASE_URL="<your cockroach url>" npx prisma db push
```

> Use `db push`, **not** `prisma migrate deploy`. The `prisma/migrations`
> folder has drifted from the live schema, and `migrate dev` demands a full
> reset that would drop data.

---

## 2. Blob storage — attachments

In the Vercel dashboard: **Storage → Create → Blob**.

Vercel injects `BLOB_READ_WRITE_TOKEN` into the project automatically. For
local development, copy it into `.env`.

Without this token, uploads are refused with a visible message. Nothing else
in the app is affected.

---

## 3. Environment variables

Set these in **Vercel → Settings → Environment Variables**:

| Variable | Value | Required |
|---|---|---|
| `DATABASE_URL` | CockroachDB pooled connection string | yes |
| `AUTH_SECRET` | `openssl rand -base64 32` — generate a fresh one | yes |
| `AUTH_URL` | `https://<your-app>.vercel.app` | yes |
| `AUTH_TRUST_HOST` | `true` | yes |
| `BLOB_READ_WRITE_TOKEN` | auto-added when you create the Blob store | for attachments |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | for Google sign-in |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | for Google sign-in |

`AUTH_SECRET` must **not** be the development placeholder. It signs session
tokens; a guessable value means forgeable sessions.

---

## 4. Google OAuth

Google Cloud Console → **Credentials** → your OAuth client → **Authorised
redirect URIs**. Add both:

```
http://localhost:3000/api/auth/callback/google
https://<your-app>.vercel.app/api/auth/callback/google
```

These must match **exactly**, including scheme and port. If the app runs on a
different port locally, sign-in breaks until that URI is added too.

If `AUTH_GOOGLE_ID` is unset, the "Continue with Google" button is hidden
rather than rendered against an unregistered provider.

---

## 5. Deploy

```bash
vercel --prod
```

`postinstall` runs `prisma generate`, so the client is always built against the
current schema rather than a cached one.

---

## 6. First-run checklist

- [ ] Visit `/signup` and create the first account (this also creates the site
      and makes you ADMIN)
- [ ] Confirm the demo login button is **absent** in production
- [ ] Create a project, create an issue, log work, upload an attachment
- [ ] Invite a teammate from `/settings/members` and open the link in a private
      window to confirm the flow

---

## Inviting teammates

1. **Settings → Members**, enter their email and role (ADMIN or MEMBER)
2. An invite link is shown inline — **send it to them yourself**; no email is
   dispatched
3. They open it, sign in with Google or a password, and are added to the site

Invite tokens are 32 random bytes, expire after 7 days, and are single-use.

---

## Known limits

- **No invite emails.** Links are copied manually. Wire up Resend or similar
  when this becomes tedious.
- **No CSP header.** The app uses inline styles that need nonces threaded
  through before a Content-Security-Policy can be added safely.
- **Development panel** on a ticket shows a suggested branch name only. There
  is no VCS integration behind it.
- **Teams and Plans** nav items are deliberately disabled placeholders.
