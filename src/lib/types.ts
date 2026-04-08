// ==========================================
// Masters Pick 6 — Core Types
// ==========================================

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  poolId: string | null;
  createdAt: string;
}

export interface Pool {
  id: string;
  name: string;
  inviteCode: string;
  adminUserId: string;
  lockDate: string; // ISO date – picks lock at tournament start
  paymentLink: string | null;
  paymentLabel: string;
  entryFee: string | null;
  createdAt: string;
}

export interface Pick {
  id: string;
  userId: string;
  poolId: string;
  tier: number; // 1-4
  golferId: string; // ESPN athlete ID
  golferName: string;
  createdAt: string;
}

export interface PoolEntry {
  userId: string;
  userName: string;
  picks: PickWithScore[];
  best5Total: number;
  rank: number;
}

export interface PickWithScore {
  golferId: string;
  golferName: string;
  tier: number;
  totalScore: number | null; // to-par score, null = hasn't started
  thru: string | null;
  status: "active" | "cut" | "wd" | "dns";
  currentRound: number | null;
  rounds: (number | null)[];
  position: string | null;
  isDropped: boolean; // worst of 6 is dropped
}

// ESPN API response shapes
// Note: The data shape changes between pre-tournament (simplified) and in-tournament (full)
export interface ESPNCompetitor {
  id: string;
  uid: string;
  order?: number; // Pre-tournament uses 'order' instead of 'sortOrder'
  athlete: {
    id?: string; // May not exist pre-tournament — use competitor.id instead
    displayName: string;
    fullName?: string;
    shortName: string;
    headshot?: { href: string };
    flag?: { href: string };
  };
  status?: {
    type: {
      id: string;
      name: string; // "STATUS_ACTIVE", "STATUS_CUT", etc.
    };
    period: number;
    displayValue: string; // "F", "1", "2", etc.
  };
  // Pre-tournament: score is a string like "E"
  // In-tournament: score is { value, displayValue }
  score:
    | string
    | {
        displayValue: string;
        value: number;
      };
  linescores?: { period?: number; value?: number; displayValue?: string }[];
  statistics?: { name: string; displayValue: string }[];
  sortOrder?: number;
}

export interface ESPNLeaderboardResponse {
  events: {
    id: string;
    name: string;
    shortName: string;
    competitions: {
      id: string;
      competitors: ESPNCompetitor[];
    }[];
    status: {
      type: {
        state: string; // "pre", "in", "post"
      };
    };
  }[];
}

export interface GolferInfo {
  id: string;
  name: string;
  rank: number | null;
  tier: number;
  score: number | null;
  toPar: number | null;
  thru: string | null;
  status: "active" | "cut" | "wd" | "dns";
  position: string | null;
  currentRound: number | null;
  rounds: (number | null)[];
  imageUrl?: string;
  countryFlag?: string;
}

export interface TieredGolfers {
  tier1: GolferInfo[]; // Top 10 OWGR — pick 1
  tier2: GolferInfo[]; // 11-25 OWGR — pick 2
  tier3: GolferInfo[]; // 26-50 OWGR — pick 2
  tier4: GolferInfo[]; // 51+ OWGR — pick 1
}

export interface SessionPayload {
  userId: string;
  name: string;
  email: string;
  exp: number;
}

// Cut penalty: 80 strokes per remaining round
export const CUT_PENALTY_PER_ROUND = 80;
