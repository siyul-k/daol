// ✅ 파일 경로: src/components/LimitProgress.jsx
import { useEffect, useState } from "react";

export default function LimitProgress({ percent = 0 }) {
  const [animatedPercent, setAnimatedPercent] = useState(0);

  useEffect(() => {
    let frame;
    const duration = 1000; // 1초 애니메이션
    const start = performance.now();

    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setAnimatedPercent(percent * progress);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [percent]);

  const p = Math.max(0, Math.min(100, animatedPercent));

  const isDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const backgroundStroke = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";

  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (p / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-56 h-56">
        <svg viewBox="0 0 120 120" className="w-full h-full rotate-[-90deg]">
          <defs>
            {/* 🌈 그라데이션만 깔끔하게 */}
            <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="40%" stopColor="#3b82f6" />
              <stop offset="70%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>

          {/* 배경 원 */}
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke={backgroundStroke}
            strokeWidth="14"
            fill="none"
          />

          {/* 진행률 원 (깔끔하게) */}
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke="url(#ring)"
            strokeWidth="14"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
          />
        </svg>

        {/* 중앙 퍼센트 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-4xl font-extrabold">{p.toFixed(2)}%</div>
        </div>
      </div>
    </div>
  );
}
