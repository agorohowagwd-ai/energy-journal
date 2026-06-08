export default function HistoryPanel({
    entries,
    search,
  }) {
    const filtered = entries.filter((e) =>
      e.activity
        ?.toLowerCase()
        .includes(search.toLowerCase())
    )
  
    return (
      <div className="border rounded-2xl p-5">
  
        <h2 className="font-semibold text-lg mb-4">
          Activity History
        </h2>
  
        <div className="space-y-3">
  
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="
                border
                rounded-xl
                p-3
              "
            >
              <div className="font-medium">
                {entry.activity}
              </div>
  
              <div className="text-sm text-gray-500">
                {entry.category}
              </div>
  
              <div className="text-sm text-gray-500">
                Energy {entry.energy} {entry.mood}
              </div>
  
              <div className="text-xs text-gray-400 mt-1">
                {entry.date}
              </div>
            </div>
          ))}
  
        </div>
  
      </div>
    )
  }