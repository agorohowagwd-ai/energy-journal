export default function Premium() {
  return (
    <div
      className="
      border
      rounded-2xl
      p-6
      bg-gradient-to-br
      from-blue-50
      to-white
      "
    >
      <h2 className="text-xl font-semibold mb-2">
        Premium
      </h2>

      <p className="text-gray-500 mb-4">
        Advanced analytics and AI coach
      </p>

      <ul className="space-y-2 text-sm">

        <li>✓ AI Coach</li>

        <li>✓ Unlimited History</li>

        <li>✓ PDF Reports</li>

        <li>✓ Deep Analytics</li>

        <li>✓ Personal Growth Dashboard</li>

      </ul>

      <button
        className="
        mt-5
        bg-blue-600
        text-white
        px-4
        py-2
        rounded-xl
        "
      >
        Upgrade
      </button>
    </div>
  )
}