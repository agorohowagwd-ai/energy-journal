export default function StatsCards({
    avgEnergy,
    streak,
    bestDay,
    totalEntries,
  }) {
    return (
      <div className="grid md:grid-cols-4 gap-4 mb-6">
  
        <div className="border rounded-2xl p-5">
          <div className="text-3xl font-semibold">
            {avgEnergy}
          </div>
          <div className="text-gray-500">
            Average Energy
          </div>
        </div>
  
        <div className="border rounded-2xl p-5">
          <div className="text-3xl font-semibold">
            {streak}
          </div>
          <div className="text-gray-500">
            Day Streak
          </div>
        </div>
  
        <div className="border rounded-2xl p-5">
          <div className="text-3xl font-semibold">
            {bestDay}
          </div>
          <div className="text-gray-500">
            Best Day
          </div>
        </div>
  
        <div className="border rounded-2xl p-5">
          <div className="text-3xl font-semibold">
            {totalEntries}
          </div>
          <div className="text-gray-500">
            Entries
          </div>
        </div>
  
      </div>
    )
  }