import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";
import { MASTERS_INFO } from "@/lib/constants";
import { getTournament } from "@/lib/tournaments/config";

// Create a new pool
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, lockDate, tournament: tournamentSlug } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Pool name is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = uuid();
    // Generate a short invite code
    const inviteCode = uuid().slice(0, 8).toUpperCase();

    // Use tournament-specific lock date or provided lock date
    const slug = tournamentSlug || "masters";
    const lock = lockDate || MASTERS_INFO.lockDateISO;

    db.prepare(
      "INSERT INTO pools (id, name, invite_code, admin_user_id, lock_date, tournament_slug) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, name, inviteCode, session.userId, lock, slug);

    // Auto-join the creator via pool_members
    db.prepare("INSERT INTO pool_members (user_id, pool_id) VALUES (?, ?)").run(
      session.userId,
      id
    );
    // Legacy compat: also set users.pool_id if they don't have one
    db.prepare("UPDATE users SET pool_id = ? WHERE id = ? AND pool_id IS NULL").run(
      id,
      session.userId
    );

    return NextResponse.json({ id, name, inviteCode, lockDate: lock });
  } catch (err) {
    console.error("Create pool error:", err);
    return NextResponse.json(
      { error: "Failed to create pool" },
      { status: 500 }
    );
  }
}

// Get current user's pools (multi-pool)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Optional: filter to a specific pool
  const { searchParams } = new URL(req.url);
  const poolIdParam = searchParams.get("poolId");

  interface MembershipRow {
    pool_id: string;
  }
  const memberships = db
    .prepare("SELECT pool_id FROM pool_members WHERE user_id = ?")
    .all(session.userId) as MembershipRow[];

  if (memberships.length === 0) {
    return NextResponse.json({ pool: null, pools: [] });
  }

  interface PoolRow {
    id: string;
    name: string;
    invite_code: string;
    admin_user_id: string;
    lock_date: string;
    payment_link: string | null;
    payment_label: string | null;
    entry_fee: string | null;
    tournament_slug: string | null;
  }

  interface MemberRow {
    id: string;
    name: string;
    email: string;
  }

  interface PaymentRow {
    user_id: string;
    paid: number;
  }

  function buildPool(pool: PoolRow) {
    const members = db
      .prepare(
        "SELECT u.id, u.name, u.email FROM users u JOIN pool_members pm ON pm.user_id = u.id WHERE pm.pool_id = ?"
      )
      .all(pool.id) as MemberRow[];

    const payments = db
      .prepare("SELECT user_id, paid FROM pool_payments WHERE pool_id = ?")
      .all(pool.id) as PaymentRow[];
    const paidMap = new Map(payments.map((p) => [p.user_id, p.paid === 1]));

    return {
      id: pool.id,
      name: pool.name,
      inviteCode: pool.invite_code,
      adminUserId: pool.admin_user_id,
      lockDate: pool.lock_date,
      paymentLink: pool.payment_link || null,
      paymentLabel: pool.payment_label || "Pay Entry Fee",
      entryFee: pool.entry_fee || null,
      tournamentSlug: pool.tournament_slug || "masters",
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        paid: paidMap.get(m.id) ?? false,
      })),
    };
  }

  // If specific pool requested, return just that one
  if (poolIdParam) {
    const pool = db.prepare("SELECT * FROM pools WHERE id = ?").get(poolIdParam) as PoolRow | undefined;
    if (!pool) {
      return NextResponse.json({ pool: null, pools: [] });
    }
    const built = buildPool(pool);
    return NextResponse.json({ pool: built, pools: [built] });
  }

  // Return all pools
  const poolIds = memberships.map((m) => m.pool_id);
  const pools = poolIds
    .map((pid) => db.prepare("SELECT * FROM pools WHERE id = ?").get(pid) as PoolRow | undefined)
    .filter(Boolean)
    .map((p) => buildPool(p!));

  // For backward compat, `pool` returns the first pool
  return NextResponse.json({ pool: pools[0] || null, pools });
}

// Update pool settings (admin only)
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  try {
    const { poolId, paymentLink, paymentLabel, entryFee, togglePaidUserId, lockDate } = await req.json();

    if (!poolId) {
      return NextResponse.json({ error: "poolId is required" }, { status: 400 });
    }

    // Verify user is admin of this pool
    interface PoolAdminRow {
      admin_user_id: string;
    }
    const pool = db
      .prepare("SELECT admin_user_id FROM pools WHERE id = ?")
      .get(poolId) as PoolAdminRow | undefined;

    if (!pool || pool.admin_user_id !== session.userId) {
      return NextResponse.json({ error: "Only pool admin can update settings" }, { status: 403 });
    }

    // Toggle a member's paid status
    if (togglePaidUserId) {
      const existing = db
        .prepare("SELECT paid FROM pool_payments WHERE pool_id = ? AND user_id = ?")
        .get(poolId, togglePaidUserId) as { paid: number } | undefined;

      if (existing) {
        db.prepare("UPDATE pool_payments SET paid = ?, marked_by = ?, marked_at = datetime('now') WHERE pool_id = ? AND user_id = ?")
          .run(existing.paid === 1 ? 0 : 1, session.userId, poolId, togglePaidUserId);
      } else {
        db.prepare("INSERT INTO pool_payments (pool_id, user_id, paid, marked_by, marked_at) VALUES (?, ?, 1, ?, datetime('now'))")
          .run(poolId, togglePaidUserId, session.userId);
      }

      return NextResponse.json({ success: true });
    }

    // Update payment link settings
    if (paymentLink !== undefined || paymentLabel !== undefined || entryFee !== undefined || lockDate !== undefined) {
      const updates: string[] = [];
      const values: (string | null)[] = [];

      if (paymentLink !== undefined) {
        updates.push("payment_link = ?");
        values.push(paymentLink || null);
      }
      if (paymentLabel !== undefined) {
        updates.push("payment_label = ?");
        values.push(paymentLabel || "Pay Entry Fee");
      }
      if (entryFee !== undefined) {
        updates.push("entry_fee = ?");
        values.push(entryFee || null);
      }
      if (lockDate !== undefined) {
        updates.push("lock_date = ?");
        values.push(lockDate);
      }

      if (updates.length > 0) {
        values.push(poolId);
        db.prepare(`UPDATE pools SET ${updates.join(", ")} WHERE id = ?`).run(...values);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update pool error:", err);
    return NextResponse.json({ error: "Failed to update pool" }, { status: 500 });
  }
}
