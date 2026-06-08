export function calculateStreak(entries) {
    if (!entries.length) return 0
  
    const dates = [
      ...new Set(entries.map((e) => e.date)),
    ].sort().reverse()
  
    let streak = 0
    let current = new Date()
  
    for (let i = 0; i < dates.length; i++) {
      const expected = current
        .toISOString()
        .split("T")[0]
  
      if (dates[i] === expected) {
        streak++
        current.setDate(current.getDate() - 1)
      } else {
        break
      }
    }
  
    return streak
  }