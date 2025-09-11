// ✅ 파일 경로: frontend/src/pages/MemberStats.jsx
import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';

export default function MemberStats() {
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    blacklist: 0,
    center: 0,
  });

  useEffect(() => {
    axios.get('/api/ad-da/members/stats')
      .then(res => setStats(res.data))
      .catch(err => console.error('회원 통계 조회 실패:', err));
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard title="전체회원" value={stats.total} />
      <StatCard title="오늘등록" value={stats.today} />
      <StatCard title="블랙리스트" value={stats.blacklist} />
      <StatCard title="센터장" value={stats.center} />
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div
      className="
        bg-white border border-gray-200 text-gray-900 shadow rounded p-4 text-center
        dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100
      "
    >
      <div className="text-gray-500 dark:text-gray-400 text-sm">{title}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
