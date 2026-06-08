export default function EntryForm({
    activity,
    setActivity,
    notes,
    setNotes,
    energy,
    setEnergy,
    category,
    setCategory,
    mood,
    setMood,
    addEntry,
  }) {
    return (
      <div className="bg-white border rounded-2xl p-6">
  
        <h2 className="text-xl font-semibold mb-4">
          New Entry
        </h2>
  
        <input
          className="w-full border rounded-xl p-3 mb-3"
          placeholder="Activity"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
        />
  
        <textarea
          className="w-full border rounded-xl p-3 mb-3"
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
  
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border rounded-xl p-3 mb-3"
        >
          <option>Work</option>
          <option>Health</option>
          <option>Sport</option>
          <option>Family</option>
          <option>Learning</option>
          <option>Friends</option>
        </select>
  
        <div className="flex gap-3 mb-4">
          {["😴", "😐", "🙂", "😊", "🤩"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              className={`text-3xl transition ${
                mood === m ? "scale-125" : ""
              }`}
            >
              {m}
            </button>
          ))}
        </div>
  
        <input
          className="w-full border rounded-xl p-3 mb-4"
          type="number"
          placeholder="Energy 1-10"
          value={energy}
          onChange={(e) => setEnergy(e.target.value)}
        />
  
        <button
          onClick={addEntry}
          className="w-full bg-blue-600 text-white py-3 rounded-xl"
        >
          Add Entry
        </button>
  
      </div>
    )
  }