import LeaderboardComponent from "@/components/Leaderboard";
import { CURRENT_YEAR } from "@/lib/constants";

export default function LeaderboardPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          ⛳ Masters Leaderboard
        </h1>
        <p className="text-gray-500 mt-1">
          Live scores from the {CURRENT_YEAR} Masters Tournament at Augusta National.
          Auto-refreshes every 30 seconds.
        </p>
      </div>

      <LeaderboardComponent />
    </div>
  );
}
