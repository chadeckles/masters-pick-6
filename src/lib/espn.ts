import type {
  ESPNLeaderboardResponse,
  GolferInfo,
  TieredGolfers,
} from "./types";
import { CUT_PENALTY_PER_ROUND } from "./types";
import {
  getTierForGolfer,
  getOwgrForGolfer,
  getAllMastersPlayerIds,
  TIER_1,
  TIER_2,
  TIER_3,
  TIER_4,
} from "./mastersTiers";
import { AUGUSTA_PAR, CURRENT_YEAR, MASTERS_EVENT_IDS } from "./constants";

// ─── ESPN API endpoints ─────────────────────────────────────────────────
// Generic scoreboard: shows the current week's event (changes weekly!)
const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard";

// Event-specific leaderboard: returns data for a SPECIFIC event (any year).
// This is the key fix — it always returns all 4 rounds of data for the Masters,
// regardless of what week it currently is on the PGA Tour schedule.
const ESPN_LEADERBOARD_URL =
  "https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard";

// ─── Caching ────────────────────────────────────────────────────────────
let cachedData: { golfers: GolferInfo[]; timestamp: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

// Cached Masters event ID for the current year (discovered from ESPN calendar)
let cachedEventId: string | null = null;

// ─── Event ID discovery ─────────────────────────────────────────────────

/**
 * Resolve the ESPN event ID for this year's Masters.
 *
 * 1. Check hardcoded lookup table (fastest, no network call).
 * 2. Check runtime cache.
 * 3. Discover dynamically from ESPN's calendar in the scoreboard response.
 */
async function getMastersEventId(): Promise<string | null> {
  // 1. Hardcoded lookup
  const known = MASTERS_EVENT_IDS[CURRENT_YEAR];
  if (known) return known;

  // 2. Runtime cache
  if (cachedEventId) return cachedEventId;

  // 3. Dynamic discovery from ESPN calendar
  try {
    const res = await fetch(ESPN_SCOREBOARD_URL, { cache: "no-store" });
    if (!res.ok) return null;

    const data = await res.json();
    const calendar: { id: string; label: string }[] =
      data.leagues?.[0]?.calendar ?? [];

    const mastersEntry = calendar.find(
      (entry) =>
        entry.label?.toLowerCase().includes("masters tournament") ||
        entry.label?.toLowerCase() === "masters"
    );

    if (mastersEntry) {
      cachedEventId = mastersEntry.id;
      return mastersEntry.id;
    }
  } catch (err) {
    console.error("Failed to discover Masters event ID:", err);
  }

  return null;
}

// ─── Main entry point ───────────────────────────────────────────────────

/**
 * Fetch live Masters leaderboard data.
 *
 * Strategy:
 *   1. Use the event-specific leaderboard API (returns all 4 rounds for
 *      the Masters event regardless of what week it is on the PGA Tour).
 *   2. Fall back to the generic scoreboard API and look for a Masters event.
 *   3. Fall back to a static field list from our tier config (no live scores).
 */
export async function fetchLeaderboard(): Promise<GolferInfo[]> {
  // Return cached data if fresh
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
    return cachedData.golfers;
  }

  try {
    // Strategy 1: Event-specific leaderboard (preferred — works for any event, any time)
    const eventId = await getMastersEventId();
    if (eventId) {
      const golfers = await fetchEventLeaderboard(eventId);
      if (golfers.length > 0) {
        cachedData = { golfers, timestamp: Date.now() };
        return golfers;
      }
    }

    // Strategy 2: Generic scoreboard (only works during Masters week)
    const golfers = await fetchFromScoreboard();
    if (golfers.length > 0) {
      cachedData = { golfers, timestamp: Date.now() };
      return golfers;
    }

    // Strategy 3: Static field from tier config (no live scores)
    const staticField = getStaticFieldFromTiers();
    cachedData = { golfers: staticField, timestamp: Date.now() };
    return staticField;
  } catch (err) {
    console.error("Failed to fetch leaderboard:", err);
    return cachedData?.golfers ?? getStaticFieldFromTiers();
  }
}

// ─── Strategy 1: Event-specific leaderboard ─────────────────────────────

/**
 * Fetch from ESPN's event-specific leaderboard endpoint.
 * Returns data for ALL rounds regardless of current PGA Tour schedule week.
 */
async function fetchEventLeaderboard(
  eventId: string
): Promise<GolferInfo[]> {
  try {
    const url = `${ESPN_LEADERBOARD_URL}?event=${eventId}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      console.warn("ESPN event leaderboard error:", res.status);
      return [];
    }

    const data: ESPNLeaderboardResponse = await res.json();
    const event = data.events?.[0];
    if (!event) return [];

    return parseCompetitors(event);
  } catch (err) {
    console.error("Event leaderboard fetch failed:", err);
    return [];
  }
}

// ─── Strategy 2: Generic scoreboard fallback ────────────────────────────

/**
 * Fallback: Fetch from generic ESPN scoreboard and find the Masters event.
 * Only works during Masters week since the scoreboard shows the current event.
 */
async function fetchFromScoreboard(): Promise<GolferInfo[]> {
  try {
    const res = await fetch(ESPN_SCOREBOARD_URL, { cache: "no-store" });
    if (!res.ok) {
      console.error("ESPN scoreboard API error:", res.status);
      return [];
    }

    const data: ESPNLeaderboardResponse = await res.json();

    // Find the Masters event
    const mastersEvent = data.events?.find(
      (e) =>
        e.name.toLowerCase().includes("masters") ||
        e.shortName.toLowerCase().includes("masters")
    );

    if (!mastersEvent) {
      console.warn("Masters event not found in scoreboard data");
      return [];
    }

    return parseCompetitors(mastersEvent);
  } catch (err) {
    console.error("Scoreboard fetch failed:", err);
    return [];
  }
}

// ─── Strategy 3: Static field from tier config ──────────────────────────

/**
 * Build a static golfer list from our tier configuration.
 * Used pre-tournament or when ESPN APIs are unavailable.
 */
function getStaticFieldFromTiers(): GolferInfo[] {
  const allTiers = [
    { entries: TIER_1, tier: 1 },
    { entries: TIER_2, tier: 2 },
    { entries: TIER_3, tier: 3 },
    { entries: TIER_4, tier: 4 },
  ];

  const golfers: GolferInfo[] = [];
  for (const { entries, tier } of allTiers) {
    for (const entry of entries) {
      golfers.push({
        id: entry.espnId,
        name: entry.name,
        rank: entry.owgr,
        tier,
        score: null,
        toPar: null,
        thru: null,
        status: "active",
        position: String(golfers.length + 1),
        currentRound: null,
        rounds: [],
      });
    }
  }

  return golfers;
}

// ─── Competitor parsing ─────────────────────────────────────────────────

function parseCompetitors(
  event: ESPNLeaderboardResponse["events"][0]
): GolferInfo[] {
  const competitors = event.competitions?.[0]?.competitors ?? [];
  const eventState = event.status?.type?.state ?? "pre";
  const mastersPlayerIds = getAllMastersPlayerIds();

  const golfers: GolferInfo[] = competitors
    .map((c, index) => {
      // ── Status ──
      const statusName = c.status?.type?.name ?? "";
      let status: GolferInfo["status"] = "active";
      if (statusName.includes("CUT")) status = "cut";
      else if (statusName.includes("WD") || statusName.includes("WITHDRAW"))
        status = "wd";
      else if (statusName.includes("DNS") || statusName.includes("DQ"))
        status = "dns";

      // ── Round scores ──
      // linescores[].value is raw strokes (e.g. 72, 68).
      // Cut players have value=0 / displayValue="-" for unplayed rounds — treat as null.
      const rounds = (c.linescores ?? []).map((ls) => {
        const val = ls.value;
        if (val === undefined || val === null || val === 0) return null;
        return val;
      });

      // ── Cumulative score ──
      let scoreValue: number | null = null;
      let scoreDisplay: string | undefined;

      if (typeof c.score === "object" && c.score !== null) {
        scoreValue = c.score.value ?? null;
        scoreDisplay = c.score.displayValue;
      } else if (typeof c.score === "string") {
        scoreDisplay = c.score;
        scoreValue = null;
      }

      const toPar = parseToPar(scoreDisplay);

      // ── Position ──
      // The event-specific API provides position in status.position.displayName (e.g. "T9").
      // The scoreboard API may use statistics or sortOrder.
      const positionFromStatus = c.status?.position?.displayName;
      const posStat = c.statistics?.find((s) => s.name === "rank");
      const position =
        positionFromStatus ??
        posStat?.displayValue ??
        (c.sortOrder ? String(c.sortOrder) : null) ??
        (c.order ? String(c.order) : String(index + 1));

      // ── Thru ──
      const thru =
        c.status?.displayValue ??
        (c.status?.thru !== undefined ? String(c.status.thru) : null) ??
        null;

      // ── Athlete ID ──
      const athleteId = c.athlete?.id ?? c.id;

      return {
        id: athleteId,
        name: c.athlete?.displayName ?? c.athlete?.fullName ?? "Unknown",
        rank: index + 1,
        tier: 0,
        score: scoreValue,
        toPar,
        thru,
        status,
        position,
        currentRound: c.status?.period ?? null,
        rounds,
        imageUrl: c.athlete?.headshot?.href,
        countryFlag: c.athlete?.flag?.href,
      };
    })
    // ── Filter: only include golfers who are actually in the Masters field ──
    .filter((g) => mastersPlayerIds.has(g.id));

  // Assign tiers and OWGR ranks from pre-set config
  golfers.forEach((g) => {
    g.rank = getOwgrForGolfer(g.id);
    g.tier = getTierForGolfer(g.id);
  });

  // ── Sort ──
  const tournamentStarted =
    eventState !== "pre" ||
    golfers.some((g) => g.score !== null && g.score !== 0);

  if (tournamentStarted) {
    golfers.sort((a, b) => {
      // Cut/WD/DNS go to bottom
      const aActive = a.status === "active" ? 0 : 1;
      const bActive = b.status === "active" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      // Then by to-par (lower is better), nulls last
      const aPar = a.toPar ?? 999;
      const bPar = b.toPar ?? 999;
      return aPar - bPar;
    });
    // Prefer ESPN's own position when available, otherwise compute from sort order
    golfers.forEach((g, i) => {
      if (g.status !== "active") {
        g.position = g.position ?? g.status.toUpperCase();
      } else if (!g.position || g.position === String(i + 1)) {
        if (
          i > 0 &&
          g.toPar !== null &&
          g.toPar === golfers[i - 1].toPar &&
          golfers[i - 1].status === "active"
        ) {
          g.position = golfers[i - 1].position;
        } else {
          g.position = String(i + 1);
        }
      }
    });
  } else {
    golfers.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return (a.rank ?? 999) - (b.rank ?? 999);
    });
    golfers.forEach((g, i) => {
      g.position = String(i + 1);
    });
  }

  cachedData = { golfers, timestamp: Date.now() };
  return golfers;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function parseToPar(displayValue: string | undefined): number | null {
  if (!displayValue) return null;
  const val = displayValue.trim();
  if (val === "E") return 0;
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
}

/**
 * Get golfers organized into tiers for pick selection
 */
export async function getTieredGolfers(): Promise<TieredGolfers> {
  const golfers = await fetchLeaderboard();
  return {
    tier1: golfers.filter((g) => g.tier === 1),
    tier2: golfers.filter((g) => g.tier === 2),
    tier3: golfers.filter((g) => g.tier === 3),
    tier4: golfers.filter((g) => g.tier === 4),
  };
}

/**
 * Get a single golfer's current score info
 */
export async function getGolferScore(
  golferId: string
): Promise<GolferInfo | null> {
  const golfers = await fetchLeaderboard();
  return golfers.find((g) => g.id === golferId) ?? null;
}

/**
 * Calculate the total to-par score for a golfer, applying cut penalties.
 *
 * For active/finished players:
 *   → Uses cumulative `toPar` from ESPN (authoritative, covers all rounds).
 *
 * For cut/WD/DNS players:
 *   → Uses cumulative `toPar` for played rounds (from ESPN `score.displayValue`).
 *   → Adds a per-round penalty for each missed round.
 *   → Penalty per missed round = CUT_PENALTY_PER_ROUND (80) − AUGUSTA_PAR (72) = +8 to-par.
 *
 * Example: Player shot 76 (+4), 74 (+2), then CUT.
 *   toPar = +6 (from ESPN), missed 2 rounds → +6 + 2×8 = +22 total.
 */
export function calculateGolferTotal(golfer: GolferInfo): number {
  if (
    golfer.status === "cut" ||
    golfer.status === "wd" ||
    golfer.status === "dns"
  ) {
    // ESPN's toPar for cut players reflects only the rounds they actually played.
    // If toPar is available, use it directly. Otherwise, calculate from round scores.
    let playedToPar: number;

    if (golfer.toPar !== null) {
      playedToPar = golfer.toPar;
    } else {
      // Fallback: compute to-par from raw round strokes
      const playedRounds = golfer.rounds.filter(
        (r): r is number => r !== null && r > 0
      );
      playedToPar = playedRounds.reduce(
        (sum, r) => sum + (r - AUGUSTA_PAR),
        0
      );
    }

    // Count played rounds (non-null, non-zero values in the rounds array)
    const playedCount = golfer.rounds.filter(
      (r) => r !== null && r > 0
    ).length;
    const missedRounds = 4 - playedCount;

    // Penalty in to-par terms: CUT_PENALTY_PER_ROUND (80 strokes) → 80 − 72 = +8 per missed round
    const penaltyPerRound = CUT_PENALTY_PER_ROUND - AUGUSTA_PAR;
    return playedToPar + missedRounds * penaltyPerRound;
  }

  // For active/finished players: cumulative toPar from ESPN is authoritative
  if (golfer.toPar !== null) return golfer.toPar;

  // Fallback: calculate from raw round scores
  const playedRounds = golfer.rounds.filter(
    (r): r is number => r !== null && r > 0
  );
  if (playedRounds.length === 0) return 0;
  return playedRounds.reduce((sum, r) => sum + (r - AUGUSTA_PAR), 0);
}
