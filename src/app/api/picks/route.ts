import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";
import { getTierForGolfer } from "@/lib/mastersTiers";

// Save picks for current user
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let { picks, poolId } = await req.json();
    // picks: Array<{ golferId: string; golferName: string; tier: number }>

    if (!picks || !Array.isArray(picks)) {
      return NextResponse.json(
        { error: "Picks array is required" },
        { status: 400 }
      );
    }

    // Resolve poolId from pool_members if not provided
    if (!poolId) {
      const db = getDb();
      const membership = db
        .prepare("SELECT pool_id FROM pool_members WHERE user_id = ? LIMIT 1")
        .get(session.userId) as { pool_id: string } | undefined;
      poolId = membership?.pool_id;
    }

    if (!poolId) {
      return NextResponse.json(
        { error: "You must join a pool first" },
        { status: 400 }
      );
    }

    // Validate: 6 picks total — 1 from tier 1, 2 from tier 2, 2 from tier 3, 1 from tier 4
    const tierCounts: Record<number, number> = {};
    for (const pick of picks) {
      tierCounts[pick.tier] = (tierCounts[pick.tier] || 0) + 1;
    }

    const expectedCounts: Record<number, number> = { 1: 1, 2: 2, 3: 2, 4: 1 };
    for (const [tier, count] of Object.entries(expectedCounts)) {
      if ((tierCounts[Number(tier)] || 0) !== count) {
        return NextResponse.json(
          {
            error: `Invalid picks: Tier ${tier} requires exactly ${count} pick(s)`,
          },
          { status: 400 }
        );
      }
    }

    // Anti-cheat: verify each golfer actually belongs to the claimed tier
    for (const pick of picks) {
      const actualTier = getTierForGolfer(pick.golferId);
      if (actualTier !== pick.tier) {
        return NextResponse.json(
          { error: `Invalid pick: ${pick.golferName || pick.golferId} is not in Tier ${pick.tier}` },
          { status: 400 }
        );
      }
    }

    const db = getDb();

    // Verify user is a member of this pool
    const membership = db
      .prepare("SELECT user_id FROM pool_members WHERE user_id = ? AND pool_id = ?")
      .get(session.userId, poolId);

    if (!membership) {
      return NextResponse.json(
        { error: "You must join this pool first" },
        { status: 400 }
      );
    }

    // Check if picks are locked
    interface PoolRow {
      lock_date: string;
    }
    const pool = db
      .prepare("SELECT lock_date FROM pools WHERE id = ?")
      .get(poolId) as PoolRow | undefined;

    if (pool && new Date(pool.lock_date) <= new Date()) {
      return NextResponse.json(
        { error: "Picks are locked — the tournament has started" },
        { status: 403 }
      );
    }

    // Delete existing picks and insert new ones (atomic)
    const deletePicks = db.prepare(
      "DELETE FROM picks WHERE user_id = ? AND pool_id = ?"
    );
    const insertPick = db.prepare(
      "INSERT INTO picks (id, user_id, pool_id, tier, golfer_id, golfer_name) VALUES (?, ?, ?, ?, ?, ?)"
    );

    const transaction = db.transaction(() => {
      deletePicks.run(session.userId, poolId);
      for (const pick of picks) {
        insertPick.run(
          uuid(),
          session.userId,
          poolId,
          pick.tier,
          pick.golferId,
          pick.golferName
        );
      }
    });

    transaction();

    return NextResponse.json({ ok: true, count: picks.length });
  } catch (err) {
    console.error("Save picks error:", err);
    return NextResponse.json(
      { error: "Failed to save picks" },
      { status: 500 }
    );
  }
}

// Get current user's picks
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const poolId = searchParams.get("poolId");

  const db = getDb();

  if (!poolId) {
    // Legacy: return picks for first pool
    const membership = db
      .prepare("SELECT pool_id FROM pool_members WHERE user_id = ? LIMIT 1")
      .get(session.userId) as { pool_id: string } | undefined;
    if (!membership) {
      return NextResponse.json({ picks: [] });
    }
    const picks = db
      .prepare("SELECT id, tier, golfer_id, golfer_name FROM picks WHERE user_id = ? AND pool_id = ? ORDER BY tier")
      .all(session.userId, membership.pool_id) as { id: string; tier: number; golfer_id: string; golfer_name: string }[];
    return NextResponse.json({
      picks: picks.map((p) => ({ id: p.id, tier: p.tier, golferId: p.golfer_id, golferName: p.golfer_name })),
    });
  }

  interface PickRow {
    id: string;
    tier: number;
    golfer_id: string;
    golfer_name: string;
  }
  const picks = db
    .prepare(
      "SELECT id, tier, golfer_id, golfer_name FROM picks WHERE user_id = ? AND pool_id = ? ORDER BY tier"
    )
    .all(session.userId, poolId) as PickRow[];

  return NextResponse.json({
    picks: picks.map((p) => ({
      id: p.id,
      tier: p.tier,
      golferId: p.golfer_id,
      golferName: p.golfer_name,
    })),
  });
}
