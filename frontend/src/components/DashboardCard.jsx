// ✅ 파일: src/components/DashboardCard.jsx
export default function DashboardCard({ icon, label, value, highlight }) {
  return (
    <div
      className={`p-4 rounded-2xl transition-all ${
        highlight
          ? "bg-gradient-to-br from-[#22d3ee]/20 to-[#f472b6]/20 border border-white/20"
          : "bg-white/5 border border-white/10"
      } backdrop-blur-xl`}
    >
      <div className="flex items-center gap-2">
        {icon && <div className="p-2 rounded-lg bg-white/10">{icon}</div>}
        <div className="text-sm opacity-80">{label}</div>
      </div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
    </div>
  );
}
