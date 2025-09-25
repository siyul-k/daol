// ✅ 파일 경로: frontend/src/pages/DepositStats.jsx
import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';

const formatKRW = (v) => new Intl.NumberFormat('ko-KR').format(Number(v || 0));

export default function DepositStats() {
  const [stats, setStats] = useState({ total: 0, today: 0, month: 0, prevMonth: 0 });

  useEffect(() => {
    axios.get('/api/ad-da/deposits/stats')
      .then(res => setStats(res.data))
      .catch(err => console.error('입금 통계 조회 실패:', err));
  }, []);

  const Card = ({ label, value }) => (
    <div
      className="rounded p-4 text-center shadow border
                 bg-white text-gray-900 border-gray-200
                 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
    >
      <div className="text-gray-500 text-sm dark:text-gray-400">{label}</div>
      {/* ✅ 숫자 강제 변환 후 1,000단위 콤마 */}
      <div className="text-xl font-bold">{formatKRW(value)} 원</div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card label="총 입금금액" value={stats.total} />
      <Card label="오늘 입금금액" value={stats.today} />
      <Card label="당월 입금금액" value={stats.month} />
      <Card label="전월 입금금액" value={stats.prevMonth} />
    </div>
  );
}
