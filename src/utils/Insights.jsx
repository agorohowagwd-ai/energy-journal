export default function Insights({
  topActivity,
  avgEnergy,
  streak,
}) {
  return (
    <div className="border rounded-2xl p-6">

      <h2 className="text-xl font-semibold mb-4">
        Insights
      </h2>

      <div className="space-y-3 text-gray-700">

        <p>
          Your average energy is{" "}
          <strong>{avgEnergy}</strong>
        </p>

        <p>
          Your current streak is{" "}
          <strong>{streak} days</strong>
        </p>

        <p>
          Activity that gives the most energy:
          <strong> {topActivity}</strong>
        </p>

      </div>

    </div>
  )
}