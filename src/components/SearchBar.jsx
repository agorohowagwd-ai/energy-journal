export default function SearchBar({
  search,
  setSearch,
}) {
  return (
    <input
      type="text"
      placeholder="Search activities..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="
        w-full
        border
        rounded-2xl
        p-3
        mb-4
      "
    />
  )
}