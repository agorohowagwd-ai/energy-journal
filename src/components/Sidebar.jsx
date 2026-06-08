export default function Sidebar({
  entries,
}) {
  const dailyMap = {}

  entries.forEach((entry) => {
    if (
      !dailyMap[entry.date] ||
      entry.energy > dailyMap[entry.date]
    ) {
      dailyMap[entry.date] = entry.energy
    }
  })

  const days = Object.entries(dailyMap)

  return (
    <div
      className="
      w-80
      border-l
      bg-gray-50
      p-4
      overflow-y-auto
      "
    >
      <h2 className="font-semibold mb-4">
        History
      </h2>

      {days.map(([date, energy]) => (
        <div
          key={date}
          className="
            p-3
            rounded-xl
            hover:bg-white
            cursor-pointer
            mb-2
          "
        >
          <div className="font-medium">
            {date}
          </div>

          <div className="text-sm text-gray-500">
            ⚡ {energy}
          </div>
        </div>
      ))}
    </div>
  )
}