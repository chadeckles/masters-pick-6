import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { calculateStandings } from "@/lib/scoring";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let poolId = searchParams.get("poolId");

  if (!poolId) {
    // Legacy fallback: use first pool
    const db = getDb();
    const membership = db
      .prepare("SELECT pool_id FROM pool_members WHERE user_id = ? LIMIT 1")
      .get(session.userId) as { pool_id: string } | undefined;
    poolId = membership?.pool_id || null;
  }

  if (!poolId) {
    return NextResponse.json({ standings: [] });
  }

  try {
    const standings = await calculateStandings(poolId);
    return NextResponse.json({ standings });
  } catch (err) {
    console.error("Standings error:", err);
    return NextResponse.json(
      { error: "Failed to calculate standings" },
      { status: 500 }
    );
  }
}
