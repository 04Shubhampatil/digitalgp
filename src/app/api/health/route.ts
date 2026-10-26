import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Liveness/readiness probe for Nginx, PM2 and monitoring. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "ok", time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: "degraded", db: "unreachable", time: new Date().toISOString() }, { status: 503 });
  }
}
