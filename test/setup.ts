import "@testing-library/jest-dom/vitest";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost:5432/dummy";
}
if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = "ci-secret-key-32-characters-minimum-length-test";
}

