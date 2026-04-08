import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { inviteCode } = await req.json();

    if (!inviteCode) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    interface PoolRow {
      id: string;
      name: string;
    }
    const pool = db
      .prepare("SELECT id, name FROM pools WHERE invite_code = ?")
      .get(inviteCode.toUpperCase()) as PoolRow | undefined;

    if (!pool) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 }
      );
    }

    // Check if user is already in a pool
    interface UserRow {
      pool_id: string | null;
    }
    const user = db
      .prepare("SELECT pool_id FROM users WHERE id = ?")
      .get(session.userId) as UserRow | undefined;

    if (user?.pool_id) {
      return NextResponse.json(
        { error: "You are already in a pool. Leave your current pool first." },
        { status: 400 }
      );
    }

    db.prepare("UPDATE users SET pool_id = ? WHERE id = ?").run(
      pool.id,
      session.userId
    );

    return NextResponse.json({ poolId: pool.id, poolName: pool.name });
  } catch (err) {
    console.error("Join pool error:", err);
    return NextResponse.json(
      { error: "Failed to join pool" },
      { status: 500 }
    );
  }
}
