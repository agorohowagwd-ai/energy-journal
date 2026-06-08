import { calculateStreak } from "../utils/streak"
import { getTopActivity } from "../utils/insights"

export function getStats(entries) {
  const avgEnergy = entries.length
    ? (
        entries.reduce(
          (s, e) => s + e.energy,
          0
        ) / entries.length
      ).toFixed(1)
    : 0

  const streak = calculateStreak(entries)

  const bestDay =
    entries.length > 0
      ? Math.max(
          ...entries.map((e) => e.energy)
        )
      : 0

  const topActivity =
    getTopActivity(entries)

  return {
    avgEnergy,
    streak,
    bestDay,
    topActivity,
  }
}