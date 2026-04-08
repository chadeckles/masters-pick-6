import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { calculateStandings } from "@/lib/scoring";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  interface UserRow {
    pool_id: string | null;
  }
  const user = db
    .prepare("SELECT pool_id FROM users WHERE id = ?")
    .get(session.userId) as UserRow | undefined;

  if (!user?.pool_id) {
    return NextResponse.json({ standings: [] });
  }

  try {
    const standings = await calculateStandings(user.pool_id);
    return NextResponse.json({ standings });
  } catch (err) {
    console.error("Standings error:", err);
    return NextResponse.json(
      { error: "Failed to calculate standings" },
      { status: 500 }
    );
  }
}
