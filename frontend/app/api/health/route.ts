import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

async function checkPostgres(): Promise<boolean | string> {
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 3000,
    });
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    await pool.end();
    return true;
  } catch (err) {
    return `unhealthy: ${err instanceof Error ? err.message : "unknown"}`;
  }
}

async function checkRedis(): Promise<boolean | string> {
  try {
    const { createClient } = await import("redis");
    const redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();
    await redis.ping();
    await redis.disconnect();
    return true;
  } catch (err) {
    return `unhealthy: ${err instanceof Error ? err.message : "unknown"}`;
  }
}

async function checkTesseract(): Promise<boolean | string> {
  try {
    const { execSync } = await import("child_process");
    const output = execSync("tesseract --version", { timeout: 5000, encoding: "utf-8" });
    const version = output.split("\n")[0] || "unknown";
    return `available (${version})`;
  } catch {
    return "unavailable: tesseract not found";
  }
}

export async function GET() {
  const [postgres, redis, tesseract] = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkTesseract(),
  ]);

  const checks = { postgres, redis, tesseract };
  const allHealthy = postgres === true && redis === true && typeof tesseract === "string" && tesseract.startsWith("available");

  logger.info({ checks, allHealthy }, "health_check");

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allHealthy ? 200 : 503 },
  );
}
