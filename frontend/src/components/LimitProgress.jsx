// ✅ 파일 경로: src/components/LimitProgress.jsx
export default function LimitProgress({ percent = 0 }) {
  const p = Math.max(0, Math.min(100, percent));

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-56 h-56">
        <svg viewBox="0 0 120 120" className="w-full h-full rotate-[-90deg]">
          <defs>
            {/* ✅ 밝은 금색 게이지 그라데이션 */}
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#FFFBEA" /> {/* 거의 흰빛 */}
              <stop offset="40%"  stopColor="#FFE066" /> {/* 밝은 골드 */}
              <stop offset="100%" stopColor="#FFB300" /> {/* 진한 금색 */}
            </linearGradient>

            {/* ✅ 배경 링 (옅은 회색 그라데이션) */}
            <linearGradient id="bgRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#F5F6F7" />
              <stop offset="100%" stopColor="#DADDE2" />
            </linearGradient>
          </defs>

          {/* 배경 원 */}
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke="url(#bgRing)"
            strokeWidth="16"
            fill="none"
          />

          {/* 진행률 원 */}
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke="url(#progressGradient)"
            strokeWidth="16"
            fill="none"
            strokeDasharray={`${(p / 100) * 314},314`}
            strokeLinecap="round"
          />
        </svg>

        {/* 중앙 퍼센트 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-3xl font-extrabold">{p}%</div>
        </div>
      </div>
    </div>
  );
}
