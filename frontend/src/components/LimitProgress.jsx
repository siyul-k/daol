// ✅ 파일 경로: src/components/LimitProgress.jsx
export default function LimitProgress({ percent = 0 }) {
  const p = Math.max(0, Math.min(100, percent));

  const isDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  // 🎨 라이트 → 회색, 다크 → 아주 옅은 투명 회색
  const backgroundStroke = isDark ? "rgba(255,255,255,0.08)" : "#d1d5db";

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-56 h-56">
        <svg viewBox="0 0 120 120" className="w-full h-full rotate-[-90deg]">
          <defs>
            <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>

          {/* ✅ 배경 원 (옅게) */}
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke={backgroundStroke}
            strokeWidth="14"
            fill="none"
          />

          {/* 진행률 원 */}
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke="url(#ring)"
            strokeWidth="14"
            fill="none"
            strokeDasharray={`${(p / 100) * 314},314`}
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-4xl font-extrabold">{p}%</div>
        </div>
      </div>
    </div>
  );
}
