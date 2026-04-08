/**
 * Shared constants — dynamic year + Masters tournament info
 */
export const CURRENT_YEAR = new Date().getFullYear();

/**
 * Masters Tournament dates.
 * The Masters doesn't follow a simple "second week of April" rule —
 * Augusta National sets the date each year. We hardcode known dates
 * and fall back to a best-guess for future years.
 */
const MASTERS_DATES: Record<number, { start: number; end: number }> = {
  2025: { start: 10, end: 13 },
  2026: { start: 9, end: 12 },
  2027: { start: 8, end: 11 },
  2028: { start: 6, end: 9 },
};

export function getMastersDates(year: number = CURRENT_YEAR) {
  const known = MASTERS_DATES[year];

  let thursday: number;
  let sunday: number;

  if (known) {
    thursday = known.start;
    sunday = known.end;
  } else {
    // Fallback: find the first Thursday in April that's on or after April 7
    // (Masters is typically the first full week of April)
    const april1 = new Date(year, 3, 1);
    const dayOfWeek = april1.getDay();
    // Find first Thursday (day 4)
    let firstThursday = dayOfWeek <= 4 ? 1 + (4 - dayOfWeek) : 1 + (11 - dayOfWeek);
    // If that Thursday is before April 7, push to next week
    if (firstThursday < 7) firstThursday += 7;
    thursday = firstThursday;
    sunday = thursday + 3;
  }

  const start = new Date(year, 3, thursday, 8, 0, 0); // 8am ET Thursday
  const end = new Date(year, 3, sunday);

  return {
    year,
    startDate: start,
    endDate: end,
    displayRange: `April ${thursday}–${sunday}, ${year}`,
    lockDateISO: start.toISOString(),
  };
}

export const MASTERS_INFO = getMastersDates();
