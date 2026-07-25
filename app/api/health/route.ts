import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: "OK" | "FAIL"; latencyMs: number }> = {};

  // 1. Database Probe
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "OK", latencyMs: Date.now() - dbStart };
  } catch (err) {
    console.error("[Health Probe] Database Check Failed:", err);
    checks.database = { status: "FAIL", latencyMs: 0 };
  }

  // 2. Redis Probe
  try {
    const redisStart = Date.now();
    if (redis) {
      await redis.ping();
      checks.redis = { status: "OK", latencyMs: Date.now() - redisStart };
    } else {
      checks.redis = { status: "OK", latencyMs: 0 }; // Memory fallback active
    }
  } catch (err) {
    console.error("[Health Probe] Redis Check Failed:", err);
    checks.redis = { status: "FAIL", latencyMs: 0 };
  }

  const isHealthy = Object.values(checks).every((c) => c.status === "OK");

  return NextResponse.json(
    {
      status: isHealthy ? "HEALTHY" : "DEGRADED",
      totalLatencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: isHealthy ? 200 : 503 }
  );
}
