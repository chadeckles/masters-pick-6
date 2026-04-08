import type {
  ESPNLeaderboardResponse,
  GolferInfo,
  TieredGolfers,
} from "./types";
import { getTierForGolfer, getOwgrForGolfer } from "./mastersTiers";

// The Masters Tournament — ESPN public scoreboard API
// Dynamically finds the Masters event in the current week's data
const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard";

let cachedData: { golfers: GolferInfo[]; timestamp: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

/**
 * Fetch live Masters leaderboard data from ESPN's public API
 */
export async function fetchLeaderboard(): Promise<GolferInfo[]> {
  // Return cached data if fresh
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
    return cachedData.golfers;
  }

  try {
    const res = await fetch(ESPN_SCOREBOARD_URL, {
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      console.error("ESPN API error:", res.status);
      return cachedData?.golfers ?? [];
    }

    const data: ESPNLeaderboardResponse = await res.json();

    // Find the Masters event (contains "Masters" in the name)
    const mastersEvent = data.events?.find(
      (e) =>
        e.name.toLowerCase().includes("masters") ||
        e.shortName.toLowerCase().includes("masters")
    );

    if (!mastersEvent) {
      console.warn("Masters event not found in ESPN data, returning all events");
      // If no Masters-specific event, use the first event (during Masters week)
      const event = data.events?.[0];
      if (!event) return cachedData?.golfers ?? [];
      return parseCompetitors(event);
    }

    return parseCompetitors(mastersEvent);
  } catch (err) {
    console.error("Failed to fetch ESPN leaderboard:", err);
    return cachedData?.golfers ?? [];
  }
}

function parseCompetitors(event: ESPNLeaderboardResponse["events"][0]): GolferInfo[] {
  const competitors = event.competitions?.[0]?.competitors ?? [];
  const eventState = event.status?.type?.state ?? "pre"; // "pre", "in", "post"

  const golfers: GolferInfo[] = competitors.map((c, index) => {
    // Handle status — may be missing pre-tournament
    const statusName = c.status?.type?.name ?? "";
    let status: GolferInfo["status"] = "active";
    if (statusName.includes("CUT")) status = "cut";
    else if (statusName.includes("WD") || statusName.includes("WITHDRAW"))
      status = "wd";
    else if (statusName.includes("DNS") || statusName.includes("DQ"))
      status = "dns";

    // Parse round scores from linescores — handle pre-tournament shape where linescores
    // may only contain { period } with no value
    const rounds = (c.linescores ?? []).map((ls) =>
      ls.value !== undefined && ls.value !== null ? ls.value : null
    );

    // Score can be either an object { value, displayValue } or a raw string (pre-tournament)
    let scoreValue: number | null = null;
    let scoreDisplay: string | undefined;

    if (typeof c.score === "object" && c.score !== null) {
      scoreValue = c.score.value ?? null;
      scoreDisplay = c.score.displayValue;
    } else if (typeof c.score === "string") {
      scoreDisplay = c.score;
      scoreValue = null; // Pre-tournament: "E" means no real score yet
    }

    // Get to-par score
    const toPar = parseToPar(scoreDisplay);

    // Determine position — may use statistics, sortOrder, or order field
    const posStat = c.statistics?.find((s) => s.name === "rank");
    const position = posStat?.displayValue
      ?? (c.sortOrder ? String(c.sortOrder) : null)
      ?? (c.order ? String(c.order) : String(index + 1));

    // Athlete ID: can be at c.athlete.id or at c.id directly
    const athleteId = c.athlete?.id ?? c.id;

    return {
      id: athleteId,
      name: c.athlete?.displayName ?? c.athlete?.fullName ?? "Unknown",
      rank: index + 1, // Will be overridden by tier assignment
      tier: 0, // Assigned below
      score: scoreValue,
      toPar,
      thru: c.status?.displayValue ?? null,
      status,
      position,
      currentRound: c.status?.period ?? null,
      rounds,
      imageUrl: c.athlete?.headshot?.href,
      countryFlag: c.athlete?.flag?.href,
    };
  });

  // Assign tiers and OWGR ranks from pre-set config (see mastersTiers.ts)
  golfers.forEach((g) => {
    g.rank = getOwgrForGolfer(g.id);
    g.tier = getTierForGolfer(g.id);
  });

  // Sort: if tournament is live (anyone has a non-null numeric score), sort by score.
  // Otherwise sort by OWGR rank (tier then rank within tier).
  const tournamentStarted = eventState !== "pre" || golfers.some(
    (g) => g.score !== null && g.score !== 0
  );

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
    // Assign position based on sort order with tie handling
    golfers.forEach((g, i) => {
      if (i > 0 && g.toPar !== null && g.toPar === golfers[i - 1].toPar && g.status === "active") {
        g.position = golfers[i - 1].position;
      } else {
        g.position = g.status !== "active" ? g.status.toUpperCase() : String(i + 1);
      }
    });
  } else {
    golfers.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return (a.rank ?? 999) - (b.rank ?? 999);
    });
    // Set position to reflect OWGR-based ordering
    golfers.forEach((g, i) => {
      g.position = String(i + 1);
    });
  }

  cachedData = { golfers, timestamp: Date.now() };
  return golfers;
}

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
 * Calculate the total to-par score for a golfer, applying cut penalties
 */
export function calculateGolferTotal(golfer: GolferInfo): number {
  if (golfer.status === "cut" || golfer.status === "wd" || golfer.status === "dns") {
    // Sum actual rounds played, then add 80 per missed round
    const playedRounds = golfer.rounds.filter((r) => r !== null);
    const playedTotal = playedRounds.reduce((sum, r) => sum + (r ?? 0), 0);
    const missedRounds = 4 - playedRounds.length;
    return playedTotal + missedRounds * 80;
  }
  // For active players, use their to-par or sum of rounds
  if (golfer.toPar !== null) return golfer.toPar;
  return golfer.rounds.reduce<number>((sum, r) => sum + (r ?? 0), 0);
}
