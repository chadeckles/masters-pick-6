/**
 * 2026 Masters Tournament — Pre-set Tier Assignments
 *
 * Tiers are based on the Official World Golf Rankings (OWGR) as of April 5, 2026.
 * ESPN is used only for live scoring during the tournament.
 *
 * Tier 1 (pick 1): OWGR  1–10   — Elite
 * Tier 2 (pick 2): OWGR 11–25   — Contenders
 * Tier 3 (pick 2): OWGR 26–50   — Mid-tier
 * Tier 4 (pick 1): OWGR 51+     — Long shots / past champions / amateurs
 *
 * To update: just move ESPN athlete IDs between tiers.
 */

export interface TierEntry {
  espnId: string;
  name: string;
  owgr: number;
}

// ─── TIER 1 — OWGR 1-10 ────────────────────────────────────────────────
export const TIER_1: TierEntry[] = [
  { espnId: "9478",    name: "Scottie Scheffler",        owgr: 1 },
  { espnId: "3470",    name: "Rory McIlroy",             owgr: 2 },
  { espnId: "4425906", name: "Cameron Young",            owgr: 3 },
  { espnId: "5539",    name: "Tommy Fleetwood",          owgr: 4 },
  { espnId: "10166",   name: "J.J. Spaun",               owgr: 5 },
  { espnId: "9037",    name: "Matt Fitzpatrick",         owgr: 6 },
  { espnId: "10592",   name: "Collin Morikawa",          owgr: 7 },
  { espnId: "11378",   name: "Robert MacIntyre",         owgr: 8 },
  { espnId: "569",     name: "Justin Rose",              owgr: 9 },
  { espnId: "10140",   name: "Xander Schauffele",        owgr: 10 },
];

// ─── TIER 2 — OWGR 11-25 ───────────────────────────────────────────────
export const TIER_2: TierEntry[] = [
  { espnId: "4690755", name: "Chris Gotterup",           owgr: 11 },
  { espnId: "5409",    name: "Russell Henley",           owgr: 12 },
  { espnId: "8961",    name: "Sepp Straka",              owgr: 13 },
  { espnId: "5860",    name: "Hideki Matsuyama",         owgr: 14 },
  { espnId: "4848",    name: "Justin Thomas",            owgr: 15 },
  { espnId: "4404992", name: "Ben Griffin",              owgr: 16 },
  { espnId: "4375972", name: "Ludvig Åberg",             owgr: 17 },
  { espnId: "5054388", name: "Jacob Bridgeman",          owgr: 18 },
  { espnId: "3832",    name: "Alex Noren",               owgr: 19 },
  { espnId: "5408",    name: "Harris English",           owgr: 20 },
  { espnId: "4419142", name: "Akshay Bhatia",            owgr: 21 },
  { espnId: "4364873", name: "Viktor Hovland",           owgr: 22 },
  { espnId: "5579",    name: "Patrick Reed",             owgr: 23 },
  { espnId: "10046",   name: "Bryson DeChambeau",        owgr: 24 },
  { espnId: "4410932", name: "Min Woo Lee",              owgr: 25 },
];

// ─── TIER 3 — OWGR 26-50 ───────────────────────────────────────────────
export const TIER_3: TierEntry[] = [
  { espnId: "4513",    name: "Keegan Bradley",           owgr: 26 },
  { espnId: "9530",    name: "Maverick McNealy",         owgr: 27 },
  { espnId: "7081",    name: "Si Woo Kim",               owgr: 28 },
  { espnId: "5076021", name: "Ryan Gerard",              owgr: 29 },
  { espnId: "9780",    name: "Jon Rahm",                 owgr: 30 },
  { espnId: "5553",    name: "Tyrrell Hatton",           owgr: 31 },
  { espnId: "4587",    name: "Shane Lowry",              owgr: 32 },
  { espnId: "9938",    name: "Sam Burns",                owgr: 33 },
  { espnId: "10364",   name: "Kurt Kitayama",            owgr: 34 },
  { espnId: "6007",    name: "Patrick Cantlay",          owgr: 35 },
  { espnId: "11250",   name: "Nicolai Højgaard",         owgr: 36 },
  { espnId: "4585549", name: "Marco Penge",              owgr: 37 },
  { espnId: "9025",    name: "Daniel Berger",            owgr: 38 },
  { espnId: "10906",   name: "Aaron Rai",                owgr: 39 },
  { espnId: "4408316", name: "Nico Echavarria",          owgr: 40 },
  { espnId: "1680",    name: "Jason Day",                owgr: 41 },
  { espnId: "9843",    name: "Jake Knapp",               owgr: 42 },
  { espnId: "8974",    name: "Michael Kim",              owgr: 43 },
  { espnId: "9126",    name: "Corey Conners",            owgr: 44 },
  { espnId: "4426181", name: "Sam Stevens",              owgr: 45 },
  { espnId: "4348470", name: "Kristoffer Reitan",        owgr: 46 },
  { espnId: "4921329", name: "Michael Brennan",          owgr: 47 },
  { espnId: "11332",   name: "Andrew Novak",             owgr: 48 },
  { espnId: "4901368", name: "Matt McCarty",             owgr: 49 },
  { espnId: "1225",    name: "Brian Harman",             owgr: 50 },
];

// ─── TIER 4 — OWGR 51+ / past champions / amateurs ─────────────────────
export const TIER_4: TierEntry[] = [
  { espnId: "4251",    name: "Ryan Fox",                 owgr: 51 },
  { espnId: "3550",    name: "Gary Woodland",            owgr: 52 },
  { espnId: "388",     name: "Adam Scott",               owgr: 53 },
  { espnId: "4585548", name: "Sami Välimäki",            owgr: 56 },
  { espnId: "11253",   name: "Rasmus Højgaard",          owgr: 57 },
  { espnId: "11101",   name: "Max Greyserman",           owgr: 59 },
  { espnId: "5467",    name: "Jordan Spieth",            owgr: 61 },
  { espnId: "4589438", name: "Harry Hall",               owgr: 62 },
  { espnId: "5217048", name: "Johnny Keefer",            owgr: 64 },
  { espnId: "3792",    name: "Nick Taylor",              owgr: 67 },
  { espnId: "4858859", name: "Rasmus Neergaard-Petersen",owgr: 69 },
  { espnId: "4610056", name: "Casey Jarvis",             owgr: 70 },
  { espnId: "11382",   name: "Sungjae Im",               owgr: 71 },
  { espnId: "5080439", name: "Aldrich Potgieter",        owgr: 77 },
  { espnId: "11119",   name: "Wyndham Clark",            owgr: 78 },
  { espnId: "9221",    name: "Haotong Li",               owgr: 84 },
  { espnId: "4348444", name: "Tom McKibbin",             owgr: 105 },
  { espnId: "9525",    name: "Brian Campbell",           owgr: 112 },
  { espnId: "10058",   name: "Davis Riley",              owgr: 120 },
  { espnId: "5532",    name: "Carlos Ortiz",             owgr: 161 },
  { espnId: "8973",    name: "Max Homa",                 owgr: 163 },
  { espnId: "6798",    name: "Brooks Koepka",            owgr: 169 },
  { espnId: "3448",    name: "Dustin Johnson",           owgr: 200 },
  { espnId: "9131",    name: "Cameron Smith",            owgr: 200 },
  // Past champions (may not have current OWGR)
  { espnId: "1097",    name: "Charl Schwartzel",         owgr: 999 },
  { espnId: "780",     name: "Bubba Watson",             owgr: 999 },
  { espnId: "4304",    name: "Danny Willett",            owgr: 999 },
  { espnId: "158",     name: "Sergio García",            owgr: 999 },
  { espnId: "392",     name: "Vijay Singh",              owgr: 999 },
  { espnId: "329",     name: "José María Olazábal",      owgr: 999 },
  { espnId: "65",      name: "Ángel Cabrera",            owgr: 999 },
  { espnId: "453",     name: "Mike Weir",                owgr: 999 },
  { espnId: "686",     name: "Zach Johnson",             owgr: 999 },
  { espnId: "91",      name: "Fred Couples",             owgr: 999 },
  // Amateurs / qualifiers
  { espnId: "4837226", name: "Naoyuki Kataoka",          owgr: 999 },
  { espnId: "5344766", name: "Jackson Herrington",       owgr: 999 },
  { espnId: "2201886", name: "Brandon Holtz",            owgr: 999 },
  { espnId: "5289811", name: "Mason Howell",             owgr: 999 },
  { espnId: "5344763", name: "Mateo Pulcini",            owgr: 999 },
  { espnId: "5293232", name: "Ethan Fang",               owgr: 999 },
  { espnId: "5327297", name: "Fifa Laopakdee",           owgr: 999 },
];

// ─── Lookup helpers ─────────────────────────────────────────────────────

/** Map of ESPN athlete ID → tier number */
const tierLookup: Map<string, number> = new Map();
for (const g of TIER_1) tierLookup.set(g.espnId, 1);
for (const g of TIER_2) tierLookup.set(g.espnId, 2);
for (const g of TIER_3) tierLookup.set(g.espnId, 3);
for (const g of TIER_4) tierLookup.set(g.espnId, 4);

/** Map of ESPN athlete ID → OWGR rank */
const owgrLookup: Map<string, number> = new Map();
for (const tier of [TIER_1, TIER_2, TIER_3, TIER_4]) {
  for (const g of tier) owgrLookup.set(g.espnId, g.owgr);
}

/**
 * Get the pre-set tier for a golfer by ESPN ID.
 * Returns 4 as default for any golfer not in the config (unranked / late add).
 */
export function getTierForGolfer(espnId: string): number {
  return tierLookup.get(espnId) ?? 4;
}

/**
 * Get the OWGR ranking for a golfer by ESPN ID.
 */
export function getOwgrForGolfer(espnId: string): number {
  return owgrLookup.get(espnId) ?? 999;
}

/**
 * Get all golfer entries for a specific tier.
 */
export function getGolfersInTier(tier: number): TierEntry[] {
  switch (tier) {
    case 1: return TIER_1;
    case 2: return TIER_2;
    case 3: return TIER_3;
    case 4: return TIER_4;
    default: return [];
  }
}
