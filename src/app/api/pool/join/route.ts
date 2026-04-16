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

    // Check if user is already in this pool
    interface MemberRow {
      user_id: string;
    }
    const existing = db
      .prepare("SELECT user_id FROM pool_members WHERE user_id = ? AND pool_id = ?")
      .get(session.userId, pool.id) as MemberRow | undefined;

    if (existing) {
      return NextResponse.json(
        { error: "You are already in this pool." },
        { status: 400 }
      );
    }

    db.prepare("INSERT INTO pool_members (user_id, pool_id) VALUES (?, ?)").run(
      session.userId,
      pool.id
    );
    // Legacy compat
    db.prepare("UPDATE users SET pool_id = ? WHERE id = ? AND pool_id IS NULL").run(
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
